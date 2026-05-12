import { texture as geotiffTexture, type GetTileDataOptions, type MinimalTileData } from '@developmentseed/deck.gl-geotiff';
import type { RenderTileResult } from '@developmentseed/deck.gl-raster';
import { DecoderPool, type GeoTIFF, type Overview } from '@developmentseed/geotiff';
import { MaskTexture as _MaskTexture } from '@developmentseed/deck.gl-raster/gpu-modules';
import type { Texture } from '@luma.gl/core';
import { TimeCOGLayer, type TimeCOGFrame } from '@floodnet/deck.gl-time-cog-layer';

import { registerLayer } from '../registry';
import type { LayerRenderContext, LayerRenderer, LayerOptionField } from '../types';
import { buildInterpolateColorGlsl } from '../../utils/deckgl/colorScales';
import type { ColorScaleConfig } from '../../types';

// import type { GeoTIFF, Overview } from "@developmentseed/geotiff";


const DEFAULT_COG_COLOR_SCALE: ColorScaleConfig = {
  type: 'gradient',
  schemeName: 'MrmsPrecip',
  scaleMin: 0,
  scaleMax: 1,
};

// The raw 16-bit pixel value is decoded, normalized by colorMaxValue with gamma correction,
// then passed to the common interpolateColor(t) function generated from the layer's colorScale.
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

// export const DEFAULT_VS_FILTER_COLOR = `\
// float v = instanceValue;
// float raw = color.r * 65535.0;
// if (raw <= 0.0) { discard; }
// t = pow(t, 0.72);
// color = interpolateColor(color.r * 65535.0);`;

const schema: LayerOptionField[] = [
  { key: 'urlField', label: 'URL field', type: 'fieldPicker', defaultValue: 'url' },
  { key: 'timestampField', label: 'Timestamp field', type: 'fieldPicker', defaultValue: 'time' },
  // { key: 'colorMaxValue', label: 'Color max value', type: 'number', defaultValue: 200 },
  { key: 'maxRequests', label: 'Max concurrent tile requests', type: 'number', defaultValue: 4 },
  { key: 'maxFrameRate', label: 'Max frame rate (fps)', type: 'number', defaultValue: 0 },
];

type CogTileData = MinimalTileData & {
  texture: Texture;
  byteLength: number;
};


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

// const PRECIP_MAX_RAW_VALUE = 200;
// const PrecipColorRamp = {
//   name: "precip-color-ramp",
//   inject: {
//     "fs:DECKGL_FILTER_COLOR": `
// float rawValue = color.r * 65535.0;
// if (rawValue <= 0.0) {
//   discard;
// }

// float t = clamp(rawValue / ${PRECIP_MAX_RAW_VALUE.toFixed(1)}, 0.0, 1.0);
// t = pow(t, 0.72);

// vec3 c0 = vec3(0.56, 0.77, 0.98);
// vec3 c1 = vec3(0.10, 0.95, 0.86);
// vec3 c2 = vec3(0.32, 0.98, 0.45);
// vec3 c3 = vec3(0.96, 0.84, 0.20);
// vec3 c4 = vec3(0.98, 0.38, 0.76);
// vec3 c5 = vec3(0.98, 0.75, 0.93);

// vec3 ramp;
// if (t < 0.18) {
//   ramp = mix(c0, c1, smoothstep(0.0, 0.18, t));
// } else if (t < 0.42) {
//   ramp = mix(c1, c2, smoothstep(0.18, 0.42, t));
// } else if (t < 0.68) {
//   ramp = mix(c2, c3, smoothstep(0.42, 0.68, t));
// } else if (t < 0.88) {
//   ramp = mix(c3, c4, smoothstep(0.68, 0.88, t));
// } else {
//   ramp = mix(c4, c5, smoothstep(0.88, 1.0, t));
// }

// float alpha = smoothstep(0.0, 0.06, t) * (0.20 + 0.70 * sqrt(t));
// color = vec4(ramp, alpha);
// `,
//   },
// } as const;

function padRowsToAlignment(
  data: Uint8Array | Uint16Array,
  width: number,
  height: number,
  bytesPerPixel: number,
): { data: Uint8Array | Uint16Array; bytesPerRow: number } {
  const rowBytes = width * bytesPerPixel;
  const bytesPerRow = Math.ceil(rowBytes / 4) * 4;
  if (bytesPerRow === rowBytes) { return { data, bytesPerRow }; }

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

async function getTileData(
  image: GeoTIFF | Overview,
  { device, x, y, signal, pool }: GetTileDataOptions,
) {
  const tile = await image.fetchTile(x, y, { boundless: false, pool, signal });
  const { array } = tile;
  const { width, height, mask } = array;

  if (array.layout === "band-separate") {
    throw new Error("Band-separate precipitation tiles are not supported.");
  }

  const data = array.data as Uint8Array | Uint16Array;
  const format = geotiffTexture.inferTextureFormat(1, new Uint16Array([16]), [1]);
  const texture = device.createTexture({
    format, width, height,
    sampler: { minFilter: "linear", magFilter: "linear" },
  });
  const upload = padRowsToAlignment(data, width, height, 2);
  texture.writeData(upload.data, { bytesPerRow: upload.bytesPerRow });
  let maskTexture: Texture | undefined;
  let byteLength = data.byteLength;

  if (mask) {
    maskTexture = device.createTexture({
      format: "r8unorm", width, height,
      sampler: { minFilter: "nearest", magFilter: "nearest" },
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


const renderer: LayerRenderer = {
  type: 'cog',
  label: 'COG Raster',
  defaultOptions: {
    urlField: 'url',
    timestampField: 'time',
    colorMaxValue: 200,
    maxRequests: 4,
    maxFrameRate: 0,
  },
  optionsSchema: schema,

  renderLayers({ config, features, cursorTimeMs }: LayerRenderContext) {
    const opts = config.options as Record<string, any>;
    const urlField: string = opts.urlField ?? 'url';
    const timestampField: string = opts.timestampField ?? 'time';
    const colorMaxValue: number = opts.colorMaxValue ?? 200;
    const colorScale: ColorScaleConfig = config.colorScale ?? DEFAULT_COG_COLOR_SCALE;
    const maxRequests: number = opts.maxRequests ?? 4;
    const maxFrameRate: number = opts.maxFrameRate ?? 0;

    const frames: TimeCOGFrame[] = [];
    for (const f of features) {
      const url = f.properties?.[urlField];
      const ts = f.properties?.[timestampField];
      if (url && ts != null) {
        frames.push({ time: Number(ts), url: String(url) });
      }
    }

    if (frames.length === 0) {return [];}

    const renderTile = getStableRenderTile(colorMaxValue, colorScale);

    return [
      new TimeCOGLayer({
        id: `cog/${config.id}`,
        frames,
        currentTime: cursorTimeMs,
        getTileData,
        renderTile,
        opacity: config.opacity,
        visible: config.visible,
        maxRequests,
        maxFrameRate,
        pool: mainThreadPool,
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
  `https://devpgbackup.blob.core.windows.net/floodnetmiscdata/data/nyc/mrms/cogs/MRMS_MRMS_PrecipRate_00.00_${formatUtcTimestamp(timeMs)}.tif`;


registerLayer(renderer);
export default renderer;
