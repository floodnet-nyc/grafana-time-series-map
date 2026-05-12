import { useMemo } from 'react';
import type { PanelData } from '@grafana/data';
import type { Layer } from '@deck.gl/core';
import type { Feature } from 'geojson';
import type { MapPanelOptions } from '../types';
import type { PanelFeaturesByLayerId } from './usePanelFeatures';
import {
  buildLookupPackedByLayerId,
  buildLookupValuesByLayerId,
  buildPreparedLayerStates,
  buildTimeFilterFlagsByLayerId,
  buildTimePackedByLayerId,
  renderPreparedLayers,
} from './panelLayersModel';

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

  const lookupPackedByLayerId = useMemo(() => {
    return buildLookupPackedByLayerId(options.layers, data.series);
  }, [data.series, options.layers]);

  const lookupByLayerId = useMemo(() => {
    return buildLookupValuesByLayerId(options.layers, lookupPackedByLayerId, cursorTimeMs);
  }, [lookupPackedByLayerId, options.layers, cursorTimeMs]);

  const flagsByLayerId = useMemo(() => {
    return buildTimeFilterFlagsByLayerId(options.layers, featuresByLayerId, packedByLayerId, cursorTimeMs, fromTimeMs, toTimeMs);
  }, [featuresByLayerId, packedByLayerId, cursorTimeMs, fromTimeMs, toTimeMs, options.layers]);

  const preparedLayerStates = useMemo(() => {
    return buildPreparedLayerStates(options.layers, featuresByLayerId, flagsByLayerId, lookupByLayerId);
  }, [featuresByLayerId, flagsByLayerId, lookupByLayerId, options.layers]);

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
