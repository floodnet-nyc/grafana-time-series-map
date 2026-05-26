import type { DataFrame } from '@grafana/data';
import type { LayerConfig } from '../../../layers';
import type { JoinedSourceConfig } from '../../../types';
import { buildPackedFromAccessors, resolveAsofLookup } from '../closestTimeFiltering';
import { dataFramesToLayerTable, getRowValue, type LayerTable } from '../layerTable';

export type PackedLookupEntry = {
  table: LayerTable;
  packed: ReturnType<typeof buildPackedFromAccessors>;
};

function getJoinedSources(layerConfig: LayerConfig): JoinedSourceConfig[] {
  return layerConfig.data.joinedSources ?? [];
}

function buildJoinedSourcePackedCacheKey(joinedSource: JoinedSourceConfig) {
  return JSON.stringify([
    joinedSource.refId,
    joinedSource.join.type,
    joinedSource.join.remoteKey,
    joinedSource.join.time,
  ]);
}

export function buildJoinedSourcePackedByLayerId(layerConfigs: LayerConfig[], series: DataFrame[]) {
  const packedByLayerId = new Map<string, Map<string, PackedLookupEntry>>();
  const packedBySourceKey = new Map<string, PackedLookupEntry>();

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

      const cacheKey = buildJoinedSourcePackedCacheKey(joinedSource);
      const cachedEntry = packedBySourceKey.get(cacheKey);
      const packedEntry =
        cachedEntry ??
        (() => {
          const table = dataFramesToLayerTable(series, joinedSource.refId, { type: 'none' }, undefined);
          return {
            table,
            packed: buildPackedFromAccessors(
              table.data.length,
              (index) => getRowValue(table, index, joinedSource.join.remoteKey) ?? '',
              (index) => {
                const raw = getRowValue(table, index, joinedSource.join.time);
                return raw instanceof Date ? raw.getTime() : Number(raw);
              }
            ),
          };
        })();

      packedBySourceKey.set(cacheKey, packedEntry);
      packedBySourceId.set(joinedSource.id, packedEntry);
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
  cursorTimeMs: number
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
        entry.table,
        entry.packed,
        joinedSource.fields.map((field) => ({ sourceField: field.field, targetField: field.as ?? field.field })),
        cursorTimeMs,
        joinedSource.join.maxLagMs
      );
      valuesBySourceId.set(joinedSource.id, resolved as Map<string, Record<string, unknown>>);
    }

    if (valuesBySourceId.size > 0) {
      valuesByLayerId.set(layerConfig.id, valuesBySourceId);
    }
  }

  return valuesByLayerId;
}
