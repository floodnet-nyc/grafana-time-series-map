import { useMemo } from 'react';
import type { Geometry } from 'geojson';
import type { MapPanelOptions } from '../types';
import type { FitBounds } from '../components/map/types';
import type { PreparedLayerState } from '../utils/dataframe/pipeline';
import { getRowGeometry } from '../utils/dataframe/layerTable';

function collectCoords(geom: Geometry | null | undefined): Array<[number, number]> {
  if (!geom) {
    return [];
  }

  switch (geom.type) {
    case 'Point':
      return [geom.coordinates as [number, number]];
    case 'MultiPoint':
    case 'LineString':
      return geom.coordinates as Array<[number, number]>;
    case 'MultiLineString':
    case 'Polygon':
      return (geom.coordinates as Array<Array<[number, number]>>).flat();
    case 'MultiPolygon':
      return (geom.coordinates as Array<Array<Array<[number, number]>>>).flat(2);
    case 'GeometryCollection':
      return geom.geometries.flatMap((child) => collectCoords(child));
    default:
      return [];
  }
}

export function useFitBounds(
  options: MapPanelOptions,
  preparedLayerStates: PreparedLayerState[]
): FitBounds | undefined {
  return useMemo(() => {
    if (options.initialView.mode !== 'fitData') {
      return undefined;
    }

    const fitSource = options.initialView.fitData?.source ?? 'lastValue';
    const selectedLayerId = options.initialView.fitData?.layerId;

    let minLng = Infinity;
    let maxLng = -Infinity;
    let minLat = Infinity;
    let maxLat = -Infinity;

    for (const preparedLayerState of preparedLayerStates) {
      const { config: layerConfig, table } = preparedLayerState;

      if (!layerConfig.visible || layerConfig.geometry.type === 'none') {
        continue;
      }

      if (fitSource === 'layer' && layerConfig.id !== selectedLayerId) {
        continue;
      }

      for (let index = 0; index < table.data.length; index += 1) {
        for (const [lng, lat] of collectCoords(getRowGeometry(table, index))) {
          if (!Number.isFinite(lng) || !Number.isFinite(lat)) {
            continue;
          }

          minLng = Math.min(minLng, lng);
          maxLng = Math.max(maxLng, lng);
          minLat = Math.min(minLat, lat);
          maxLat = Math.max(maxLat, lat);
        }
      }
    }

    if (!Number.isFinite(minLng) || !Number.isFinite(minLat)) {
      return undefined;
    }

    return [
      [minLng, minLat],
      [maxLng, maxLat],
    ];
  }, [
    options.initialView.fitData?.layerId,
    options.initialView.fitData?.source,
    options.initialView.mode,
    preparedLayerStates,
  ]);
}
