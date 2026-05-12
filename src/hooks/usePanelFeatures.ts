import { useMemo } from 'react';
import type { PanelData } from '@grafana/data';
import type { MapPanelOptions } from '../types';
import { dataFramesToFeatures, type GeoFeature } from '../utils/dataframe/toGeoJsonFeatures';

export type PanelFeaturesByLayerId = Map<string, GeoFeature[]>;

export function usePanelFeatures(data: PanelData, options: MapPanelOptions): PanelFeaturesByLayerId {
  return useMemo(() => {
    const featuresByLayerId = new Map<string, GeoFeature[]>();

    for (const layerConfig of options.layers) {
      const features = dataFramesToFeatures(
        data.series,
        layerConfig.queryRefId,
        layerConfig.geometry,
        layerConfig.elevation,
        layerConfig.fieldMappings,
      );
      featuresByLayerId.set(layerConfig.id, features);
    }

    return featuresByLayerId;
  }, [data.series, options.layers]);
}
