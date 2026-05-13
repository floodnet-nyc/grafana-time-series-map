import { useMemo } from 'react';
import type { PanelData } from '@grafana/data';
import type { Layer } from '@deck.gl/core';
import type { Feature } from 'geojson';
import type { MapPanelOptions } from '../types';
import {
  buildSecondarySourcePackedByLayerId,
  buildSecondarySourceValuesByLayerId,
  buildPreparedLayerStates,
  buildTimeFilterFlagsByLayerId,
  buildTimePackedByLayerId,
  renderPreparedLayers,
} from '../utils/dataframe/panelLayersModel';
import { type GeoFeature, dataFramesToFeatures } from 'utils/dataframe/toGeoJsonFeatures';

export function usePanelLayers(
  options: MapPanelOptions,
  featuresByLayerId: PanelFeaturesByLayerId,
  data: PanelData,
  cursorTimeMs: number,
  fromTimeMs: number,
  toTimeMs: number,
  selectedKey: string | null,
  onFeatureClick?: (feature: Feature, info: any) => void,
): Layer[] {
  const packedByLayerId = useMemo(() => {
    return buildTimePackedByLayerId(options.layers, featuresByLayerId);
  }, [featuresByLayerId, options.layers]);

  const secondarySourcePackedByLayerId = useMemo(() => {
    return buildSecondarySourcePackedByLayerId(options.layers, data.series);
  }, [data.series, options.layers]);

  const secondarySourceValuesByLayerId = useMemo(() => {
    return buildSecondarySourceValuesByLayerId(options.layers, secondarySourcePackedByLayerId, cursorTimeMs);
  }, [cursorTimeMs, options.layers, secondarySourcePackedByLayerId]);

  const flagsByLayerId = useMemo(() => {
    return buildTimeFilterFlagsByLayerId(options.layers, featuresByLayerId, packedByLayerId, cursorTimeMs, fromTimeMs, toTimeMs);
  }, [featuresByLayerId, packedByLayerId, cursorTimeMs, fromTimeMs, toTimeMs, options.layers]);

  const preparedLayerStates = useMemo(() => {
    return buildPreparedLayerStates(options.layers, featuresByLayerId, flagsByLayerId, secondarySourceValuesByLayerId);
  }, [featuresByLayerId, flagsByLayerId, options.layers, secondarySourceValuesByLayerId]);

  return useMemo(() => {
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
}

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
        layerConfig.fieldMappings
      );
      featuresByLayerId.set(layerConfig.id, features);
    }

    return featuresByLayerId;
  }, [data.series, options.layers]);
}

