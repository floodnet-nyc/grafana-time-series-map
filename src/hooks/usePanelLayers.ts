import { useMemo } from 'react';
import type { PanelData } from '@grafana/data';
import type { Layer } from '@deck.gl/core';
import type { Feature } from 'geojson';
import type { MapPanelOptions } from '../types';
import { dataFramesToFeatures } from '../utils/dataframe/toGeoJsonFeatures';
import { buildPacked, computeClosestFlags } from '../utils/deckgl/closestTimeFiltering';
import { getLayer } from '../layers/registry';

export function usePanelLayers(
  data: PanelData,
  options: MapPanelOptions,
  cursorTimeMs: number,
  fromTimeMs: number,
  toTimeMs: number,
  onFeatureClick?: (feature: Feature, info: any) => void,
): Layer[] {
  // Stage 1: parse DataFrames → GeoJSON features per layer
  const featuresByLayerId = useMemo(() => {
    const map = new Map<string, Feature[]>();
    for (const layerConfig of options.layers) {
      let features = dataFramesToFeatures(
          data.series,
          layerConfig.queryRefId,
          layerConfig.geometry,
          layerConfig.fieldMappings,
        )
      if (layerConfig.elevation?.field) {
        features = features.slice().sort((a, b) => {
          const az = Number(a.properties?.[layerConfig.elevation?.field ?? ''] ?? 0);
          const bz = Number(b.properties?.[layerConfig.elevation?.field ?? ''] ?? 0);
          return az - bz;
        });
      }
      map.set(
        layerConfig.id,
        features,
      );
    }
    return map;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.series, options.layers]);

  // Stage 2: build ASOF packed buckets (only for asof layers)
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

  // Stage 3: compute time filter flags (cheap typed-array ops, runs every cursor tick)
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
      }
    }
    return map;
  }, [featuresByLayerId, packedByLayerId, cursorTimeMs, fromTimeMs, toTimeMs, options.layers]);

  // Stage 4: call layer renderers
  return useMemo(() => {
    const allLayers: Layer[] = [];
    for (const layerConfig of options.layers) {
      if (!layerConfig.visible) continue;
      const renderer = getLayer(layerConfig.type);
      if (!renderer) continue;
      const features = featuresByLayerId.get(layerConfig.id) ?? [];
      const timeFilterFlags = flagsByLayerId.get(layerConfig.id) ?? new Uint8Array(features.length);
      const layers = renderer.renderLayers({
        config: layerConfig,
        features,
        cursorTimeMs,
        fromTimeMs,
        toTimeMs,
        timeFilterFlags,
        onFeatureClick,
      });
      allLayers.push(...layers);
    }
    return allLayers;
  }, [featuresByLayerId, flagsByLayerId, cursorTimeMs, fromTimeMs, toTimeMs, options.layers, onFeatureClick]);
}
