import type { LayerExtension } from '@deck.gl/core';
import { DataFilterExtension } from '@deck.gl/extensions';
import type { Feature } from 'geojson';
import type { BaseLayerConfig, FeaturePickingInfo, LayerRenderContext, LayerSettingsObject } from './types';
import { buildFeatureAt, getRowGeometry, type LayerDatum } from '../utils/dataframe/layerTable';

type ElevationSettings = { depthTest?: boolean };

export const DEFAULT_SELECTED_COLOR: [number, number, number, number] = [255, 230, 60, 255];

export function createCommonLayerProps<TLayerConfig extends BaseLayerConfig<string, LayerSettingsObject>>({
  config,
  data,
  table,
  timeFilterFlags,
  onFeatureClick,
}: LayerRenderContext<TLayerConfig>) {
  return {
    config,
    id: `${config.type}/${config.id}`,
    data,
    visible: config.visible,
    opacity: config.opacity,
    pickable: config.pickable ?? true,
    minZoom: config.minZoom,
    maxZoom: config.maxZoom,
    onClick:
      onFeatureClick && (config.pickable ?? true)
        ? (info: FeaturePickingInfo<TLayerConfig>, _event: unknown) => {
            const datum = info.object as LayerDatum | undefined;
            if (!datum) {
              return;
            }
            onFeatureClick(buildFeatureAt(table, datum.__idx), {
              ...info,
              object: buildFeatureAt(table, datum.__idx),
            });
          }
        : undefined,
    getFilterValue: timeFilterFlags
      ? (datum: LayerDatum) => (datum.__idx === undefined || timeFilterFlags[datum.__idx] ? 1 : -1)
      : undefined,
    filterRange: [1, 1] as [number, number],
    updateTriggers: {
      getFilterValue: [timeFilterFlags],
    },
    extensions: [timeFilterFlags ? new DataFilterExtension({ filterSize: 1 }) : undefined].filter(
      Boolean
    ) as LayerExtension[],
    parameters: {
      depthTest: (config?.settings as ElevationSettings)?.depthTest ?? false,
    },
  };
}

export function getFeatureLngLat(feature: Feature): [number, number] {
  const coords = (feature.geometry as { coordinates?: number[] } | null)?.coordinates;
  return coords ? [coords[0] ?? 0, coords[1] ?? 0] : [0, 0];
}

export function getFeaturePosition(feature: Feature, z?: number, offset = 0): [number, number, number] {
  const [lng, lat] = getFeatureLngLat(feature);
  return [lng, lat, (z ?? 0) + offset];
}

export function getDatumLngLat(table: LayerRenderContext<any>['table'], index: number): [number, number] {
  const geometry = getRowGeometry(table, index) as { coordinates?: number[] } | null;
  const coords = geometry?.coordinates;
  return coords ? [coords[0] ?? 0, coords[1] ?? 0] : [0, 0];
}

export function getDatumPosition(
  table: LayerRenderContext<any>['table'],
  index: number,
  z?: number,
  offset = 0
): [number, number, number] {
  const [lng, lat] = getDatumLngLat(table, index);
  return [lng, lat, (z ?? 0) + offset];
}
