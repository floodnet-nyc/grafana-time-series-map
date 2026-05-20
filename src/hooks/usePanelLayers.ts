import { 
  // useEffect, 
  useMemo, 
  // useRef, useState 
} from 'react';
import type { PanelData } from '@grafana/data';
import type { Layer } from '@deck.gl/core';
import type { Feature } from 'geojson';
import type { MapPanelOptions } from '../types';
import {
  buildJoinedSourcePackedByLayerId,
  buildJoinedSourceValuesByLayerId,
  buildPreparedLayerStates,
  buildTimeFilterFlagsByLayerId,
  buildTimePackedByLayerId,
  renderPreparedLayers,
  type PreparedLayerState,
} from '../utils/dataframe/pipeline';
import { getLayerElevation } from '../layers/utils';
import { 
  type GeoFeature, dataFramesToFeatures, 
  // geojsonToFeatures 
} from '../utils/dataframe/toGeoJsonFeatures';

export interface UsePanelLayersResult {
  layers: Layer[];
  preparedLayerStates: PreparedLayerState[];
}

export function usePanelLayers(
  options: MapPanelOptions,
  featuresByLayerId: PanelFeaturesByLayerId,
  data: PanelData,
  cursorTimeMs: number,
  fromTimeMs: number,
  toTimeMs: number,
  selectedKey: string | null,
  onFeatureClick?: (feature: Feature, info: any) => void,
): UsePanelLayersResult {
  // Feature rows are the stable upstream substrate for all selector stages below.
  const timePackedByLayerId = useMemo(() => {
    return buildTimePackedByLayerId(options.layers, featuresByLayerId);
  }, [featuresByLayerId, options.layers]);

  const joinedSourcePackedByLayerId = useMemo(() => {
    return buildJoinedSourcePackedByLayerId(options.layers, data.series);
  }, [data.series, options.layers]);

  const joinedSourceValuesByLayerId = useMemo(() => {
    return buildJoinedSourceValuesByLayerId(options.layers, joinedSourcePackedByLayerId, cursorTimeMs);
  }, [cursorTimeMs, options.layers, joinedSourcePackedByLayerId]);

  const timeFlagsByLayerId = useMemo(() => {
    return buildTimeFilterFlagsByLayerId(options.layers, featuresByLayerId, timePackedByLayerId, cursorTimeMs, fromTimeMs, toTimeMs);
  }, [featuresByLayerId, timePackedByLayerId, cursorTimeMs, fromTimeMs, toTimeMs, options.layers]);

  const preparedLayerStates = useMemo(() => {
    return buildPreparedLayerStates(options.layers, featuresByLayerId, timeFlagsByLayerId, joinedSourceValuesByLayerId);
  }, [featuresByLayerId, timeFlagsByLayerId, options.layers, joinedSourceValuesByLayerId]);

  const layers = useMemo(() => {
    return renderPreparedLayers({
      preparedLayerStates,
      options,
      cursorTimeMs,
      fromTimeMs,
      toTimeMs,
      selectedKey,
      onFeatureClick,
    });
  }, [preparedLayerStates, cursorTimeMs, fromTimeMs, toTimeMs, options, selectedKey, onFeatureClick]);

  return useMemo(
    () => ({
      layers,
      preparedLayerStates,
    }),
    [layers, preparedLayerStates],
  );
}

export type PanelFeaturesByLayerId = Map<string, GeoFeature[]>;

export function usePanelFeatures(data: PanelData, options: MapPanelOptions): PanelFeaturesByLayerId {
  
  const featuresByLayerId = useMemo(() => {
    const featuresByLayerId = new Map<string, GeoFeature[]>();

    for (const layerConfig of options.layers) {
      const features = dataFramesToFeatures(
        data.series,
        layerConfig.data.featureSource.refId,
        layerConfig.geometry,
        (layerConfig.settings as any)?.field?.field,
        layerConfig.data.featureSource.id,
      );
      featuresByLayerId.set(layerConfig.id, features);
    }

    return featuresByLayerId;
  }, [data.series, options.layers]);

  return featuresByLayerId;
}
