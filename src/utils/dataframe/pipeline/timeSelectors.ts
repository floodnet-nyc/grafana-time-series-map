import type { LayerConfig } from '../../../layers';
import { buildPackedFromAccessors, computeClosestFlags } from '../closestTimeFiltering';
import type { LayerTableLike } from '../layerTable';
import { coerceLayerTable, getRowValue } from '../layerTable';

export type TimePackedByLayerId = Map<string, ReturnType<typeof buildPackedFromAccessors>>;

export function buildTimePackedByLayerId(layerConfigs: LayerConfig[], tablesByLayerId: Map<string, LayerTableLike>): TimePackedByLayerId {
  const packedByLayerId = new Map<string, ReturnType<typeof buildPackedFromAccessors>>();

  for (const layerConfig of layerConfigs) {
    if (layerConfig.timeFilter.mode !== 'asof') {
      continue;
    }

    const timeRef = layerConfig.timeFilter.time;
    if (!timeRef?.field || timeRef.source !== layerConfig.data.featureSource.id) {
      continue;
    }

    const tableLike = tablesByLayerId.get(layerConfig.id);
    const table = tableLike ? coerceLayerTable(tableLike, layerConfig.data.featureSource.id) : undefined;
    const groupByRef = layerConfig.timeFilter.groupBy;
    packedByLayerId.set(
      layerConfig.id,
      buildPackedFromAccessors(
        table?.data.length ?? 0,
        (index) => groupByRef?.field ? getRowValue(table!, index, groupByRef.field) ?? '' : '',
        (index) => {
          const raw = getRowValue(table!, index, timeRef.field);
          return raw instanceof Date ? raw.getTime() : Number(raw);
        },
      ),
    );
  }

  return packedByLayerId;
}

export function buildTimeFilterFlagsByLayerId(
  layerConfigs: LayerConfig[],
  tablesByLayerId: Map<string, LayerTableLike>,
  packedByLayerId: TimePackedByLayerId,
  cursorTimeMs: number,
  fromTimeMs: number,
  toTimeMs: number,
) {
  const flagsByLayerId = new Map<string, Uint8Array>();

  for (const layerConfig of layerConfigs) {
    const tableLike = tablesByLayerId.get(layerConfig.id);
    const table = tableLike ? coerceLayerTable(tableLike, layerConfig.data.featureSource.id) : undefined;
    const rowCount = table?.data.length ?? 0;
    const { mode, time, maxLagMs } = layerConfig.timeFilter;

    if (mode === 'none' || !time?.field || time.source !== layerConfig.data.featureSource.id) {
      flagsByLayerId.set(layerConfig.id, new Uint8Array(rowCount).fill(1));
      continue;
    }

    if (mode === 'window') {
      const tolerance = layerConfig.timeFilter.windowToleranceMs ?? 0;
      const flags = new Uint8Array(rowCount);

      table?.data.forEach((_row, index) => {
        const raw = getRowValue(table, index, time.field);
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
        packed ? computeClosestFlags(packed.buckets, cursorTimeMs, maxLagMs) : new Uint8Array(rowCount),
      );
      continue;
    }

    flagsByLayerId.set(layerConfig.id, new Uint8Array(rowCount));
  }

  return flagsByLayerId;
}
