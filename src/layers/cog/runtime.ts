import {
  texture as geotiffTexture,
  type GetTileDataOptions,
  type MinimalTileData,
} from '@developmentseed/deck.gl-geotiff';
import type { RenderTileResult } from '@developmentseed/deck.gl-raster';
import { DecoderPool, type GeoTIFF, type Overview } from '@developmentseed/geotiff';
import { TimeCOGLayer } from '@floodnet/deck.gl-time-cog-layer';
import type { Texture } from '@luma.gl/core';
import { buildInterpolateColorGlsl } from '../../utils/deckgl/colorScales';
import type { LayerRenderContext } from '../types';
import { DEFAULT_COG_COLOR_SCALE, type CogLayerConfig } from '.';

const mainThreadPool = new DecoderPool();

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

function getRenderTile(colorMaxValue: number, colorScale = DEFAULT_COG_COLOR_SCALE): (data: CogTileData) => RenderTileResult {
  const colorDecl = buildInterpolateColorGlsl(colorScale);
  const colorModule = {
    name: `cog-color`,
    inject: {
      'fs:#decl': colorDecl,
      'fs:DECKGL_FILTER_COLOR': buildFsFilterColor(),
    },
  };

  return (data: CogTileData): RenderTileResult => ({
    image: data.texture as any,
    renderPipeline: [{ module: colorModule as any }],
  });
}

function padRowsToAlignment(
  data: Uint8Array | Uint16Array,
  width: number,
  height: number,
  bytesPerPixel: number
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

export function renderCogLayers(context: LayerRenderContext<CogLayerConfig>) {
  const { config, data, cursorTimeMs, getAccessor, getAccessors } = context;
  const options = config.settings;

  const [getUrl, updatesUrl] = getAccessor<string>(options.url, '');
  const [getTime, updatesTime] = getAccessors.number(options.timestamp, 0);

  return [
    new TimeCOGLayer({
      id: `cog/${config.id}`,
      data,
      currentTime: cursorTimeMs,
      getUrl,
      getTime,
      getTileData,
      renderTile: getRenderTile(options.colorMaxValue, config.colorScale ?? DEFAULT_COG_COLOR_SCALE),
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
}
