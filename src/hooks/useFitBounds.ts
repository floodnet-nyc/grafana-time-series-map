import { useMemo } from 'react';
import type { Geometry } from 'geojson';
import type { PanelFeaturesByLayerId } from './usePanelLayers';
import type { MapPanelOptions } from '../types';
import type { FitBounds } from '../components/map/types';

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

export function useFitBounds(options: MapPanelOptions, featuresByLayerId: PanelFeaturesByLayerId): FitBounds | undefined {
  return useMemo(() => {
    if (options.initialView.mode !== 'fitData') {
      return undefined;
    }

    let minLng = Infinity;
    let maxLng = -Infinity;
    let minLat = Infinity;
    let maxLat = -Infinity;

    for (const layerConfig of options.layers) {
      if (!layerConfig.visible || layerConfig.geometry.type === 'none') {
        continue;
      }

      const features = featuresByLayerId.get(layerConfig.id) ?? [];
      for (const feature of features) {
        for (const [lng, lat] of collectCoords(feature.geometry)) {
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
  }, [featuresByLayerId, options.initialView.mode, options.layers]);
}
