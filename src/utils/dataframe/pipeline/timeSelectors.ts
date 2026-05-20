import type { LayerConfig } from '../../../layers';
import { buildPackedFromAccessors, computeClosestFlags } from '../closestTimeFiltering';
import type { PanelFeaturesByLayerId } from '../../../hooks/usePanelLayers';

export type TimePackedByLayerId = Map<string, ReturnType<typeof buildPackedFromAccessors>>;

export function buildTimePackedByLayerId(layerConfigs: LayerConfig[], featuresByLayerId: PanelFeaturesByLayerId): TimePackedByLayerId {
  const packedByLayerId = new Map<string, ReturnType<typeof buildPackedFromAccessors>>();

  for (const layerConfig of layerConfigs) {
    if (layerConfig.timeFilter.mode !== 'asof') {
      continue;
    }

    const timeRef = layerConfig.timeFilter.time;
    if (!timeRef?.field || timeRef.source !== layerConfig.data.featureSource.id) {
      continue;
    }

    const features = featuresByLayerId.get(layerConfig.id) ?? [];
    const groupByRef = layerConfig.timeFilter.groupBy;
    packedByLayerId.set(
      layerConfig.id,
      buildPackedFromAccessors(
        features.length,
        (index) => groupByRef?.field ? features[index].properties?.[groupByRef.field] ?? '' : '',
        (index) => {
          const raw = features[index].properties?.[timeRef.field];
          return raw instanceof Date ? raw.getTime() : Number(raw);
        },
      ),
    );
  }

  return packedByLayerId;
}

export function buildTimeFilterFlagsByLayerId(
  layerConfigs: LayerConfig[],
  featuresByLayerId: PanelFeaturesByLayerId,
  packedByLayerId: TimePackedByLayerId,
  cursorTimeMs: number,
  fromTimeMs: number,
  toTimeMs: number,
) {
  const flagsByLayerId = new Map<string, Uint8Array>();

  for (const layerConfig of layerConfigs) {
    const features = featuresByLayerId.get(layerConfig.id) ?? [];
    const { mode, time, maxLagMs } = layerConfig.timeFilter;

    if (mode === 'none' || !time?.field || time.source !== layerConfig.data.featureSource.id) {
      flagsByLayerId.set(layerConfig.id, new Uint8Array(features.length).fill(1));
      continue;
    }

    if (mode === 'window') {
      const tolerance = layerConfig.timeFilter.windowToleranceMs ?? 0;
      const flags = new Uint8Array(features.length);

      features.forEach((feature, index) => {
        const raw = feature.properties?.[time.field];
        const timeMs = raw instanceof Date ? raw.getTime() : Number(raw);
        flags[index] = Number.isFinite(timeMs) && timeMs >= fromTimeMs - tolerance && timeMs <= toTimeMs + tolerance ? 1 : 0;
      });

      flagsByLayerId.set(layerConfig.id, flags);
      continue;
    }

    if (mode === 'asof') {
      const packed = packedByLayerId.get(layerConfig.id);
      flagsByLayerId.set(
        layerConfig.id,
        packed ? computeClosestFlags(packed.buckets, cursorTimeMs, maxLagMs) : new Uint8Array(features.length),
      );
      continue;
    }

    flagsByLayerId.set(layerConfig.id, new Uint8Array(features.length));
  }

  return flagsByLayerId;
}
