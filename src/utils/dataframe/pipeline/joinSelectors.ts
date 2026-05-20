import type { DataFrame } from '@grafana/data';
import type { Feature } from 'geojson';
import type { LayerConfig } from '../../../layers';
import type { JoinedSourceConfig } from '../../../types';
import { buildPackedFromAccessors, resolveAsofLookup } from '../closestTimeFiltering';
import { dataFramesToFeatures } from '../toGeoJsonFeatures';

export type PackedLookupEntry = {
  features: Feature[];
  packed: ReturnType<typeof buildPackedFromAccessors>;
};

function getJoinedSources(layerConfig: LayerConfig): JoinedSourceConfig[] {
  return layerConfig.data.joinedSources ?? [];
}

export function buildJoinedSourcePackedByLayerId(layerConfigs: LayerConfig[], series: DataFrame[]) {
  const packedByLayerId = new Map<string, Map<string, PackedLookupEntry>>();

  for (const layerConfig of layerConfigs) {
    const joinedSources = getJoinedSources(layerConfig);
    if (joinedSources.length === 0) {
      continue;
    }

    const packedBySourceId = new Map<string, PackedLookupEntry>();

    for (const joinedSource of joinedSources) {
      if (joinedSource.join.type !== 'asof') {
        continue;
      }

      const features = dataFramesToFeatures(series, joinedSource.refId, { type: 'none' }, undefined);
      packedBySourceId.set(joinedSource.id, {
        features,
        packed: buildPackedFromAccessors(
          features.length,
          (index) => features[index].properties?.[joinedSource.join.remoteKey] ?? '',
          (index) => {
            const raw = features[index].properties?.[joinedSource.join.time];
            return raw instanceof Date ? raw.getTime() : Number(raw);
          },
        ),
      });
    }

    if (packedBySourceId.size > 0) {
      packedByLayerId.set(layerConfig.id, packedBySourceId);
    }
  }

  return packedByLayerId;
}

export function buildJoinedSourceValuesByLayerId(
  layerConfigs: LayerConfig[],
  packedByLayerId: Map<string, Map<string, PackedLookupEntry>>,
  cursorTimeMs: number,
) {
  const valuesByLayerId = new Map<string, Map<string, Map<string, Record<string, unknown>>>>();

  for (const layerConfig of layerConfigs) {
    const joinedSources = getJoinedSources(layerConfig);
    if (joinedSources.length === 0) {
      continue;
    }

    const packedBySourceId = packedByLayerId.get(layerConfig.id);
    if (!packedBySourceId) {
      continue;
    }

    const valuesBySourceId = new Map<string, Map<string, Record<string, unknown>>>();

    for (const joinedSource of joinedSources) {
      const entry = packedBySourceId.get(joinedSource.id);
      if (!entry || joinedSource.join.type !== 'asof') {
        continue;
      }

      const resolved = resolveAsofLookup(
        entry.features,
        entry.packed,
        joinedSource.fields.map((field) => ({ sourceField: field.field, targetField: field.as ?? field.field })),
        cursorTimeMs,
        joinedSource.join.maxLagMs,
      );
      valuesBySourceId.set(joinedSource.id, resolved as Map<string, Record<string, unknown>>);
    }

    if (valuesBySourceId.size > 0) {
      valuesByLayerId.set(layerConfig.id, valuesBySourceId);
    }
  }

  return valuesByLayerId;
}
