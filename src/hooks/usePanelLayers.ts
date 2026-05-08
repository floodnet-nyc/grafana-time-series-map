import { useMemo } from 'react';
import type { PanelData } from '@grafana/data';
import type { Layer } from '@deck.gl/core';
import type { Feature } from 'geojson';
import type { MapPanelOptions } from '../types';
import { dataFramesToFeatures } from '../utils/dataframe/toGeoJsonFeatures';
import { buildPacked, computeClosestFlags, resolveAsofLookup } from '../utils/deckgl/closestTimeFiltering';
import { getLayer } from '../layers/registry';

export function usePanelLayers(
  data: PanelData,
  options: MapPanelOptions,
  cursorTimeMs: number,
  fromTimeMs: number,
  toTimeMs: number,
  selectedKey: string | null,
  onFeatureClick?: (feature: Feature, info: any) => void,
): Layer[] {
  // console.log('usePanelLayers', { data, options, cursorTimeMs, fromTimeMs, toTimeMs });
  // Stage 1: parse DataFrames → GeoJSON features per layer
  const featuresByLayerId = useMemo(() => {
    const map = new Map<string, Feature[]>();
    for (const layerConfig of options.layers) {
      let features = dataFramesToFeatures(
          data.series,
          layerConfig.queryRefId,
          layerConfig.geometry,
          layerConfig.elevation,
          layerConfig.fieldMappings,
        )
      map.set(
        layerConfig.id,
        features,
      );
    }
    return map;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.series, options.layers]);

  // Stage 3: build ASOF packed buckets (only for asof layers)
  const packedByLayerId = useMemo(() => {
    const map = new Map<string, ReturnType<typeof buildPacked>>();
    for (const layerConfig of options.layers) {
      if (layerConfig.timeFilter.mode !== 'asof') continue;
      const features = featuresByLayerId.get(layerConfig.id) ?? [];
      const { timeField, groupByField = 'id' } = layerConfig.timeFilter;
      map.set(layerConfig.id, buildPacked(features, groupByField, timeField));
    }
    return map;
  }, [featuresByLayerId, options.layers]);

  // Stage 2: build lookup packed series (parse + sort; runs on data/config change, not cursor ticks)
  const lookupPackedByLayerId = useMemo(() => {
    const result = new Map<string, { features: Feature[]; packed: ReturnType<typeof buildPacked> }>();
    for (const layerConfig of options.layers) {
      if (!layerConfig.lookup) continue;
      const { queryRefId, keyField, timeField } = layerConfig.lookup;
      const features = dataFramesToFeatures(data.series, queryRefId, { type: 'none' }, undefined, []);
      result.set(layerConfig.id, { features, packed: buildPacked(features, keyField, timeField) });
    }
    return result;
  }, [data.series, options.layers]);

  // Stage 2b: resolve asof lookup scalars at cursor time (binary search only; runs every cursor tick)
  const lookupByLayerId = useMemo(() => {
    const result = new Map<string, Map<string, Record<string, number>>>();
    for (const layerConfig of options.layers) {
      if (!layerConfig.lookup) continue;
      const entry = lookupPackedByLayerId.get(layerConfig.id);
      if (!entry) continue;
      result.set(
        layerConfig.id,
        resolveAsofLookup(entry.features, entry.packed, layerConfig.lookup.fields, cursorTimeMs, layerConfig.lookup.maxLagMs),
      );
    }
    return result;
  }, [lookupPackedByLayerId, options.layers, cursorTimeMs]);


  // Stage 4: compute time filter flags (cheap typed-array ops, runs every cursor tick)
  const flagsByLayerId = useMemo(() => {
    const map = new Map<string, Uint8Array>();
    for (const layerConfig of options.layers) {
      const features = featuresByLayerId.get(layerConfig.id) ?? [];
      const n = features.length;
      const { mode, timeField, maxLagMs } = layerConfig.timeFilter;

      if (mode === 'none' || !timeField) {
        map.set(layerConfig.id, new Uint8Array(n).fill(1));
      } else if (mode === 'window') {
        const tolerance = layerConfig.timeFilter.windowToleranceMs ?? 0;
        const flags = new Uint8Array(n);
        features.forEach((f, i) => {
          const raw = f.properties?.[timeField];
          const t = raw instanceof Date ? raw.getTime() : Number(raw);
          flags[i] = t >= fromTimeMs - tolerance && t <= toTimeMs + tolerance ? 1 : 0;
        });
        map.set(layerConfig.id, flags);
      } else if (mode === 'asof') {
        const packed = packedByLayerId.get(layerConfig.id);
        map.set(
          layerConfig.id,
          packed
            ? computeClosestFlags(packed.buckets, cursorTimeMs, maxLagMs)
            : new Uint8Array(n),
        );
      } else {
        map.set(layerConfig.id, new Uint8Array(n));
      }
    }
    return map;
  }, [featuresByLayerId, packedByLayerId, cursorTimeMs, fromTimeMs, toTimeMs, options.layers]);

  // Stage 5: call layer renderers
  return useMemo(() => {
    const allLayers: Layer[] = [];
    for (const layerConfig of options.layers) {
      if (!layerConfig.visible) { continue; }
      const renderer = getLayer(layerConfig.type);
      if (!renderer) { continue; }
      const features = featuresByLayerId.get(layerConfig.id)!;
      const timeFilterFlags = flagsByLayerId.get(layerConfig.id)!;
      const lookupValues = lookupByLayerId.get(layerConfig.id);
      const layers = renderer.renderLayers({
        config: layerConfig,
        features,
        cursorTimeMs,
        fromTimeMs,
        toTimeMs,
        timeFilterFlags,
        lookupValues,
        selectedKey,
        onFeatureClick,
      });
      allLayers.push(...layers);
    }
    return allLayers;
  }, [featuresByLayerId, flagsByLayerId, lookupByLayerId, cursorTimeMs, fromTimeMs, toTimeMs, options.layers, selectedKey, onFeatureClick]);
}
