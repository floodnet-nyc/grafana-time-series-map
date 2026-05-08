import { COGLayer, texture as geotiffTexture } from '@developmentseed/deck.gl-geotiff';
import type { GetTileDataOptions, MinimalTileData } from '@developmentseed/deck.gl-geotiff';
import type { RenderTileResult } from '@developmentseed/deck.gl-raster';
import type { GeoTIFF, Overview } from '@developmentseed/geotiff';
import { DecoderPool } from '@developmentseed/geotiff';
import { MaskTexture as _MaskTexture } from '@developmentseed/deck.gl-raster/gpu-modules';
import type { Texture } from '@luma.gl/core';

import { registerLayer } from '../registry';
import type { LayerRenderContext, LayerRenderer, LayerOptionField } from '../types';
import { buildInterpolateColorGlsl } from '../../utils/deckgl/colorScales';
import type { ColorScaleConfig } from '../../types';

const DEFAULT_COG_COLOR_SCALE: ColorScaleConfig = {
  type: 'gradient',
  schemeName: 'MrmsPrecip',
  scaleMin: 0,
  scaleMax: 1,
};

// The raw 16-bit pixel value is decoded, normalized by colorMaxValue with gamma correction,
// then passed to the common interpolateColor(t) function generated from the layer's colorScale.
function buildFsFilterColor(colorMaxValue: number): string {
  return `\
float raw = color.r * 65535.0;
if (raw <= 0.0) { discard; }
float t = clamp(raw / ${colorMaxValue.toFixed(1)}, 0.0, 1.0);
t = pow(t, 0.72);
vec4 c = interpolateColor(t);
float alpha = smoothstep(0.0, 0.06, t) * (0.20 + 0.70 * sqrt(t));
color = vec4(c.rgb, alpha);`;
}

const schema: LayerOptionField[] = [
  { key: 'urlField', label: 'URL field', type: 'fieldPicker', defaultValue: 'url' },
  { key: 'timestampField', label: 'Timestamp field', type: 'fieldPicker', defaultValue: 'time' },
  { key: 'colorMaxValue', label: 'Color max value', type: 'number', defaultValue: 200 },
  { key: 'maxRequests', label: 'Max concurrent tile requests', type: 'number', defaultValue: 4 },
];

type CogTileData = MinimalTileData & {
  texture: Texture;
  byteLength: number;
};

function padToAlignment(
  data: Uint8Array | Uint16Array,
  width: number,
  height: number,
  bytesPerPixel: number,
): Uint8Array | Uint16Array {
  const rowBytes = width * bytesPerPixel;
  const alignedRowBytes = Math.ceil(rowBytes / 4) * 4;
  if (alignedRowBytes === rowBytes) return data;

  const src = new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
  const dst = new Uint8Array(alignedRowBytes * height);
  for (let row = 0; row < height; row++) {
    dst.set(src.subarray(row * rowBytes, (row + 1) * rowBytes), row * alignedRowBytes);
  }
  return data instanceof Uint16Array ? new Uint16Array(dst.buffer) : dst;
}

async function getTileData(
  image: GeoTIFF | Overview,
  { device, x, y, signal, pool }: GetTileDataOptions,
): Promise<CogTileData> {
  console.log('Requesting tile1', { x, y }, image); // DEBUG
  let tile: Awaited<ReturnType<typeof image.fetchTile>>;
  try {
    tile = await image.fetchTile(x, y, { boundless: false, pool, signal });
  } catch (err) {
    console.error('fetchTile failed', { x, y }, err);
    throw err;
  }
  console.log('Requesting tile2', { x, y }, tile); // DEBUG
  const { array } = tile;
  const { width, height, mask: _mask } = array;

  if (array.layout === 'band-separate') {
    throw new Error('Band-separate COG tiles are not supported.');
  }

  const aligned = padToAlignment(array.data as Uint8Array | Uint16Array, width, height, 2);
  let byteLength = aligned.byteLength;
  const texture = device.createTexture({
    data: aligned,
    format: geotiffTexture.inferTextureFormat(1, new Uint16Array([16]), [1] as any),
    width,
    height,
    sampler: { minFilter: 'linear', magFilter: 'linear' },
  });

  // let maskTexture: Texture | undefined;
  // if (mask) {
  //   const alignedMask = padToAlignment(mask, width, height, 1);
  //   maskTexture = device.createTexture({
  //     data: alignedMask,
  //     format: 'r8unorm',
  //     width,
  //     height,
  //     sampler: {
  //       minFilter: 'nearest',
  //       magFilter: 'nearest',
  //     },
  //   });
  //   byteLength += alignedMask.byteLength;
  // }

  return { texture, byteLength, width, height };
}

// No-worker pool: avoids defaultDecoderPool() which spawns a Web Worker that
// fails in webpack AMD bundles (Grafana plugins). Falls back to main-thread decoding.
const mainThreadPool = new DecoderPool();

// Cache keyed by colorMaxValue + scheme identity so COGLayer.clearState() isn't triggered
// by a new function reference on every render.
const renderTileCache = new Map<string, (data: CogTileData) => RenderTileResult>();

function cogCacheKey(colorMaxValue: number, cs: ColorScaleConfig): string {
  if (cs.type === 'threshold') {
    return `${colorMaxValue}:threshold:${JSON.stringify(cs.steps ?? [])}`;
  }
  return `${colorMaxValue}:${cs.schemeName ?? ''}:${cs.invert ?? false}:${cs.scaleMin ?? 0}:${cs.scaleMax ?? 1}`;
}

function getStableRenderTile(
  colorMaxValue: number,
  colorScale: ColorScaleConfig,
): (data: CogTileData) => RenderTileResult {
  const key = cogCacheKey(colorMaxValue, colorScale);
  if (!renderTileCache.has(key)) {
    const colorDecl = buildInterpolateColorGlsl(colorScale);
    const colorModule = {
      name: `cog-color-${key}`,
      inject: {
        'fs:#decl': colorDecl,
        'fs:DECKGL_FILTER_COLOR': buildFsFilterColor(colorMaxValue),
      },
    };
    renderTileCache.set(key, (data: CogTileData): RenderTileResult => ({
      image: data.texture as any,
      renderPipeline: [{ module: colorModule as any }],
    }));
  }
  return renderTileCache.get(key)!;
}

function snapToNearest(timeMs: number, timestamps: number[]): number | null {
  if (timestamps.length === 0) return null;
  let best = timestamps[0];
  let bestDist = Math.abs(timeMs - best);
  for (const t of timestamps) {
    const d = Math.abs(timeMs - t);
    if (d < bestDist) { best = t; bestDist = d; }
  }
  return best;
}

const renderer: LayerRenderer = {
  type: 'cog',
  label: 'COG Raster',
  defaultOptions: {
    urlField: 'url',
    timestampField: 'time',
    colorMaxValue: 200,
    maxRequests: 4,
  },
  optionsSchema: schema,

  renderLayers({ config, features, cursorTimeMs }: LayerRenderContext) {
    const opts = config.options as Record<string, any>;
    const urlField: string = opts.urlField ?? 'url';
    const timestampField: string = opts.timestampField ?? 'time';
    const colorMaxValue: number = opts.colorMaxValue ?? 200;
    const colorScale: ColorScaleConfig = config.colorScale ?? DEFAULT_COG_COLOR_SCALE;
    const maxRequests: number = opts.maxRequests ?? 4;

    const entries: Array<{ timeMs: number; url: string }> = [];
    for (const f of features) {
      const url = f.properties?.[urlField];
      const ts = f.properties?.[timestampField];
      if (url && ts != null) {
        entries.push({ timeMs: Number(ts), url: String(url) });
      }
    }

    if (entries.length === 0) return [];

    const timestamps = entries.map((e) => e.timeMs);
    const activeTimeMs = snapToNearest(cursorTimeMs, timestamps);

    const renderTile = getStableRenderTile(colorMaxValue, colorScale);
    // console.log(entries.slice(700,720))
    return entries.map(({ timeMs, url }) =>
      // config.visible && timeMs === activeTimeMs && console.log(url) || 
      new COGLayer<CogTileData>({
        id: `${config.id}-${timeMs}`,
        geotiff: url,
        // geotiff: buildPrecipCogUrl(timeMs),
        getTileData,
        renderTile,
        opacity: config.opacity,
        visible: config.visible && timeMs === activeTimeMs,
        pickable: false,
        maxRequests,
        pool: mainThreadPool,
      }),
    );
  },
};

const pad2 = (value: number) => String(value).padStart(2, '0');
const formatUtcTimestamp = (timeMs: number) => {
  const time = new Date(timeMs);
  return [
    time.getUTCFullYear(),
    pad2(time.getUTCMonth() + 1),
    pad2(time.getUTCDate()),
    'T',
    pad2(time.getUTCHours()),
    pad2(time.getUTCMinutes()),
    pad2(time.getUTCSeconds()),
    'Z',
  ].join('');
};

export const buildPrecipCogUrl = (timeMs: number) =>
  `http://localhost:3000/sample-data/cogs/${formatUtcTimestamp(timeMs)}.tif`;


registerLayer(renderer);
export default renderer;
