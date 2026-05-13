import { useMemo } from 'react';
import type { PanelData } from '@grafana/data';
import type { Layer, PickingInfo } from '@deck.gl/core';
import type { Feature } from 'geojson';
import type { MapPanelOptions } from '../types';
import type { DeckTooltipContent } from '../components/map/types';
import { buildDeckTooltip } from '../layers/extensions/tooltip';
import {
  buildSecondarySourcePackedByLayerId,
  buildSecondarySourceValuesByLayerId,
  buildPreparedLayerStates,
  buildTimeFilterFlagsByLayerId,
  buildTimePackedByLayerId,
  renderPreparedLayers,
} from '../utils/dataframe/panelLayersModel';
import { type GeoFeature, dataFramesToFeatures } from '../utils/dataframe/toGeoJsonFeatures';

export interface UsePanelLayersResult {
  layers: Layer[];
  getTooltip: ((info: PickingInfo) => DeckTooltipContent) | null;
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

  const getTooltip = useMemo(() => buildDeckTooltip(preparedLayerStates), [preparedLayerStates]);

  return useMemo(
    () => ({
      layers,
      getTooltip,
    }),
    [getTooltip, layers],
  );
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
