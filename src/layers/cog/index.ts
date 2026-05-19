import { texture as geotiffTexture, type GetTileDataOptions, type MinimalTileData } from '@developmentseed/deck.gl-geotiff';
import type { RenderTileResult } from '@developmentseed/deck.gl-raster';
import { MaskTexture as _MaskTexture } from '@developmentseed/deck.gl-raster/gpu-modules';
import { DecoderPool, type GeoTIFF, type Overview } from '@developmentseed/geotiff';
import { TimeCOGLayer, type TimeCOGFrame } from '@floodnet/deck.gl-time-cog-layer';
import type { Texture } from '@luma.gl/core';
import type { ColorScaleConfig, SourceRef } from '../../types';
import type { BaseLayerConfig, LayerDefinition, LayerRenderContext } from '../types';
import { buildInterpolateColorGlsl } from '../../utils/deckgl/colorScales';
import { createBaseLayerConfig, createSourceRef, section } from '../defaults';

export interface CogLayerSettings {
  url: SourceRef;
  timestamp: SourceRef;
  colorMaxValue: number;
  maxRequests: number;
  maxFrameRate: number;
}

export type CogLayerConfig = BaseLayerConfig<'cog', CogLayerSettings>;

const DEFAULT_COG_COLOR_SCALE: ColorScaleConfig = {
  type: 'gradient',
  schemeName: 'MrmsPrecip',
  scaleMin: 0,
  scaleMax: 1,
};

const mainThreadPool = new DecoderPool();
const renderTileCache = new Map<string, (data: CogTileData) => RenderTileResult>();

type CogTileData = MinimalTileData & {
  texture: Texture;
  byteLength: number;
};

function buildFsFilterColor(): string {
  return `\
float raw = color.r * 65535.0;
if (raw <= 0.0) { discard; }
float t = clamp(raw / 200.0, 0.0, 1.0);
t = pow(t, 0.72);
vec4 c = interpolateColor(t);
float alpha = smoothstep(0.0, 0.06, t) * (0.20 + 0.70 * sqrt(t));
color = vec4(c.rgb, alpha);`;
}

function cogCacheKey(colorMaxValue: number, cs: ColorScaleConfig): string {
  if (cs.type === 'threshold') {
    return `${colorMaxValue}:threshold:${JSON.stringify(cs.steps ?? [])}`;
  }
  return `${colorMaxValue}:${cs.schemeName ?? ''}:${cs.invert ?? false}:${cs.scaleMin ?? 0}:${cs.scaleMax ?? 1}`;
}

function getStableRenderTile(colorMaxValue: number, colorScale: ColorScaleConfig): (data: CogTileData) => RenderTileResult {
  const key = cogCacheKey(colorMaxValue, colorScale);
  if (!renderTileCache.has(key)) {
    const colorDecl = buildInterpolateColorGlsl(colorScale);
    const colorModule = {
      name: `cog-color-${key}`,
      inject: {
        'fs:#decl': colorDecl,
        'fs:DECKGL_FILTER_COLOR': buildFsFilterColor(),
      },
    };
    renderTileCache.set(key, (data: CogTileData): RenderTileResult => ({
      image: data.texture as any,
      renderPipeline: [{ module: colorModule as any }],
    }));
  }
  return renderTileCache.get(key)!;
}

function padRowsToAlignment(
  data: Uint8Array | Uint16Array,
  width: number,
  height: number,
  bytesPerPixel: number,
): { data: Uint8Array | Uint16Array; bytesPerRow: number } {
  const rowBytes = width * bytesPerPixel;
  const bytesPerRow = Math.ceil(rowBytes / 4) * 4;
  if (bytesPerRow === rowBytes) {
    return { data, bytesPerRow };
  }
  const src = new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
  const dstBytes = new Uint8Array(bytesPerRow * height);
  for (let row = 0; row < height; row += 1) {
    dstBytes.set(src.subarray(row * rowBytes, (row + 1) * rowBytes), row * bytesPerRow);
  }
  return {
    data: data instanceof Uint16Array ? new Uint16Array(dstBytes.buffer) : dstBytes,
    bytesPerRow,
  };
}

async function getTileData(image: GeoTIFF | Overview, { device, x, y, signal, pool }: GetTileDataOptions) {
  const tile = await image.fetchTile(x, y, { boundless: false, pool, signal });
  const { array } = tile;
  const { width, height, mask } = array;
  if (array.layout === 'band-separate') {
    throw new Error('Band-separate precipitation tiles are not supported.');
  }
  const data = array.data as Uint8Array | Uint16Array;
  const format = geotiffTexture.inferTextureFormat(1, new Uint16Array([16]), [1]);
  const texture = device.createTexture({
    format,
    width,
    height,
    sampler: { minFilter: 'linear', magFilter: 'linear' },
  });
  const upload = padRowsToAlignment(data, width, height, 2);
  texture.writeData(upload.data, { bytesPerRow: upload.bytesPerRow });
  let maskTexture: Texture | undefined;
  let byteLength = data.byteLength;
  if (mask) {
    maskTexture = device.createTexture({
      format: 'r8unorm',
      width,
      height,
      sampler: { minFilter: 'nearest', magFilter: 'nearest' },
    });
    const maskUpload = padRowsToAlignment(mask, width, height, 1);
    maskTexture.writeData(maskUpload.data, { bytesPerRow: maskUpload.bytesPerRow });
    byteLength += mask.byteLength;
  }
  return {
    texture,
    mask: maskTexture,
    byteLength,
    width,
    height,
  };
}

const defaultSettings: CogLayerSettings = {
  url: createSourceRef('url'),
  timestamp: createSourceRef('time'),
  colorMaxValue: 200,
  maxRequests: 4,
  maxFrameRate: 0,
};

export const cogLayerDefinition: LayerDefinition<CogLayerConfig> = {
  type: 'cog',
  label: 'COG Raster',
  createDefaultConfig(index) {
    return createBaseLayerConfig('cog', 'COG Raster', index, defaultSettings, { type: 'none' });
  },
  editorSections: [
    section('COG Raster', [
      { key: 'url', label: 'URL field', type: 'fieldPicker', defaultValue: createSourceRef('url') },
      { key: 'timestamp', label: 'Timestamp field', type: 'fieldPicker', defaultValue: createSourceRef('time') },
      { key: 'maxRequests', label: 'Max concurrent tile requests', type: 'number', defaultValue: 4 },
      { key: 'maxFrameRate', label: 'Max frame rate (fps)', type: 'number', defaultValue: 0 },
    ]),
  ],
  renderLayers(context: LayerRenderContext<CogLayerConfig>) {
    const { config, features, cursorTimeMs, getAccessor } = context;
    const options = config.settings;
    const colorScale: ColorScaleConfig = config.colorScale ?? DEFAULT_COG_COLOR_SCALE;
    const frames: TimeCOGFrame[] = [];
    for (const f of features) {
      const url = options.url.field ? f.properties?.[options.url.field] : undefined;
      const ts = options.timestamp.field ? f.properties?.[options.timestamp.field] : undefined;
      if (url && ts != null) {
        frames.push({ time: Number(ts), url: String(url) });
      }
    }
    if (frames.length === 0) {
      return [];
    }
    const renderTile = getStableRenderTile(options.colorMaxValue, colorScale);

    const [getUrl, updatesUrl] = getAccessor(options.url);
    const [getTime, updatesTime] = getAccessor(options.timestamp);

    return [
      new TimeCOGLayer({
        id: `cog/${config.id}`,
        frames: features,
        currentTime: cursorTimeMs,
        getUrl,
        getTime,
        getTileData,
        renderTile,
        opacity: config.opacity,
        visible: config.visible,
        maxRequests: options.maxRequests,
        maxFrameRate: options.maxFrameRate,
        pool: mainThreadPool,
        updateTriggers: {
          getUrl: updatesUrl,
          getTime: updatesTime,
        },
      }),
    ];
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

export default cogLayerDefinition;
