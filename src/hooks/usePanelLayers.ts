import { useMemo } from 'react';
import type { PanelData } from '@grafana/data';
import type { Layer } from '@deck.gl/core';
import type { Feature } from 'geojson';
import type { MapPanelOptions } from '../types';
import type { FeaturePickingInfo } from '../layers/types';
import {
  buildJoinedSourcePackedByLayerId,
  buildJoinedSourceValuesByLayerId,
  buildPreparedLayerStates,
  buildTimeFilterFlagsByLayerId,
  buildTimePackedByLayerId,
  renderPreparedLayers,
  type PreparedLayerState,
} from '../utils/dataframe/pipeline';
import { dataFramesToLayerTable, type LayerTablesByLayerId } from '../utils/dataframe/layerTable';
import type { GeometrySource, FeatureSourceConfig } from '../utils/dataframe/toGeoJsonFeatures';

export interface UsePanelLayersResult {
  layers: Layer[];
  preparedLayerStates: PreparedLayerState[];
}

export function usePanelLayers(
  options: MapPanelOptions,
  tablesByLayerId: LayerTablesByLayerId,
  data: PanelData,
  cursorTimeMs: number,
  fromTimeMs: number,
  toTimeMs: number,
  selectedKey: string | null,
  onFeatureClick?: (feature: Feature, info: FeaturePickingInfo) => void,
): UsePanelLayersResult {
  // Layer tables are the stable upstream substrate for all selector stages below.
  const timePackedByLayerId = useMemo(() => {
    return buildTimePackedByLayerId(options.layers, tablesByLayerId);
  }, [tablesByLayerId, options.layers]);

  const joinedSourcePackedByLayerId = useMemo(() => {
    return buildJoinedSourcePackedByLayerId(options.layers, data.series);
  }, [data.series, options.layers]);

  const joinedSourceValuesByLayerId = useMemo(() => {
    return buildJoinedSourceValuesByLayerId(options.layers, joinedSourcePackedByLayerId, cursorTimeMs);
  }, [cursorTimeMs, options.layers, joinedSourcePackedByLayerId]);

  const timeFlagsByLayerId = useMemo(() => {
    return buildTimeFilterFlagsByLayerId(options.layers, tablesByLayerId, timePackedByLayerId, cursorTimeMs, fromTimeMs, toTimeMs);
  }, [tablesByLayerId, timePackedByLayerId, cursorTimeMs, fromTimeMs, toTimeMs, options.layers]);

  const preparedLayerStates = useMemo(() => {
    return buildPreparedLayerStates(options.layers, tablesByLayerId, timeFlagsByLayerId, joinedSourceValuesByLayerId);
  }, [tablesByLayerId, timeFlagsByLayerId, options.layers, joinedSourceValuesByLayerId]);

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

export type PanelFeaturesByLayerId = LayerTablesByLayerId;

function buildFeatureSourceCacheKey(
  featureSource: FeatureSourceConfig,
  geometry: GeometrySource,
  elevationField: string | undefined,
) {
  return JSON.stringify([featureSource.refId ?? '', featureSource.id, geometry, elevationField ?? '']);
}

export function usePanelFeatures(data: PanelData, options: MapPanelOptions): PanelFeaturesByLayerId {
  const featuresByLayerId = useMemo(() => {
    const featuresByLayer = new Map<string, ReturnType<typeof dataFramesToLayerTable>>();
    const featuresBySourceKey = new Map<string, ReturnType<typeof dataFramesToLayerTable>>();

    for (const layerConfig of options.layers) {
      const elevationField =
        typeof layerConfig.settings === 'object' &&
        layerConfig.settings !== null &&
        'field' in layerConfig.settings &&
        typeof layerConfig.settings.field === 'object' &&
        layerConfig.settings.field !== null &&
        'field' in layerConfig.settings.field &&
        typeof layerConfig.settings.field.field === 'string'
          ? layerConfig.settings.field.field
          : undefined;
      const cacheKey = buildFeatureSourceCacheKey(layerConfig.data.featureSource, layerConfig.geometry, elevationField);
      const cachedFeatures = featuresBySourceKey.get(cacheKey);
      const features =
        cachedFeatures ??
        dataFramesToLayerTable(
          data.series,
          layerConfig.data.featureSource.refId,
          layerConfig.geometry,
          elevationField,
          layerConfig.data.featureSource.id,
        );
      featuresBySourceKey.set(cacheKey, features);
      featuresByLayer.set(layerConfig.id, features);
    }

    return featuresByLayer;
  }, [data.series, options.layers]);

  return featuresByLayerId;
}
