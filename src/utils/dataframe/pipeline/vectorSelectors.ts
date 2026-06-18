import type { Geometry, Point } from 'geojson';
import type { LayerConfig } from '../../../layers';
import { closestIndex, buildPackedFromAccessors } from '../closestTimeFiltering';
import { coerceLayerTable, getRowGeometry, getRowValue, type LayerDatum, type LayerTableLike } from '../layerTable';

export type GroupedVectorPackedByLayerId = Map<string, ReturnType<typeof buildPackedFromAccessors>>;

export interface PreparedGroupedVectorsState {
  data: LayerDatum[];
  pathByIndex: Map<number, number[][]>;
  numericArrayByField: Map<string, Map<number, number[]>>;
}

function isPointGeometry(geometry: Geometry | null): geometry is Point {
  return geometry?.type === 'Point';
}

function supportsGroupedVectors(layerConfig: LayerConfig) {
  return layerConfig.geometry.type === 'latlng';
}

function materializePointPath(indices: Uint32Array, getPoint: (index: number) => number[] | null): number[][] {
  const path: number[][] = [];

  for (const index of indices) {
    const point = getPoint(index);
    if (point && point.length >= 2) {
      path.push(point);
    }
  }

  return path;
}

function materializeValues(indices: Uint32Array, getValue: (index: number) => number): number[] {
  return Array.from(indices, (index) => getValue(index)).filter(Number.isFinite);
}

export function buildGroupedVectorPackedByLayerId(layerConfigs: LayerConfig[], tablesByLayerId: Map<string, LayerTableLike>) {
  const packedByLayerId: GroupedVectorPackedByLayerId = new Map();

  for (const layerConfig of layerConfigs) {
    if (!supportsGroupedVectors(layerConfig)) {
      continue;
    }

    const groupByRef = layerConfig.timeFilter.groupBy;
    const timeRef = layerConfig.timeFilter.time;
    if (!groupByRef?.field || !timeRef?.field || timeRef.source !== layerConfig.data.featureSource.id) {
      continue;
    }

    const tableLike = tablesByLayerId.get(layerConfig.id);
    const table = tableLike ? coerceLayerTable(tableLike, layerConfig.data.featureSource.id) : undefined;
    if (!table) {
      continue;
    }

    packedByLayerId.set(
      layerConfig.id,
      buildPackedFromAccessors(
        table.data.length,
        (index) => getRowValue(table, index, groupByRef.field) ?? '',
        (index) => {
          const raw = getRowValue(table, index, timeRef.field);
          return raw instanceof Date ? raw.getTime() : Number(raw);
        }
      )
    );
  }

  return packedByLayerId;
}

export function buildPreparedGroupedVectorsByLayerId(
  layerConfigs: LayerConfig[],
  tablesByLayerId: Map<string, LayerTableLike>,
  packedByLayerId: GroupedVectorPackedByLayerId,
  cursorTimeMs: number
) {
  const preparedByLayerId = new Map<string, PreparedGroupedVectorsState>();

  for (const layerConfig of layerConfigs) {
    if (!supportsGroupedVectors(layerConfig)) {
      continue;
    }

    const tableLike = tablesByLayerId.get(layerConfig.id);
    const table = tableLike ? coerceLayerTable(tableLike, layerConfig.data.featureSource.id) : undefined;
    if (!table) {
      continue;
    }

    const packed = packedByLayerId.get(layerConfig.id);
    if (!packed) {
      preparedByLayerId.set(layerConfig.id, {
        data: table.data,
        pathByIndex: new Map(),
        numericArrayByField: new Map(),
      });
      continue;
    }

    const data: LayerDatum[] = [];
    const pathByIndex = new Map<number, number[][]>();
    const numericArrayByField = new Map<string, Map<number, number[]>>();
    const timeFieldName = layerConfig.timeFilter.time?.field;
    if (timeFieldName) {
      numericArrayByField.set(timeFieldName, new Map<number, number[]>());
    }

    for (const bucket of packed.buckets) {
      if (bucket.indices.length === 0) {
        continue;
      }

      const representativeOffset = closestIndex(bucket.times, cursorTimeMs);
      const representativeIndex = bucket.indices[representativeOffset];
      const path = materializePointPath(bucket.indices, (index) => {
        const geometry = getRowGeometry(table, index);
        return isPointGeometry(geometry) ? (geometry.coordinates as number[]) : null;
      });
      const timestamps = materializeValues(bucket.indices, (index) => {
        const raw = getRowValue(table, index, layerConfig.timeFilter.time?.field ?? '');
        return raw instanceof Date ? raw.getTime() : Number(raw);
      });

      data.push(table.data[representativeIndex]);
      pathByIndex.set(representativeIndex, path);
      if (timeFieldName) {
        numericArrayByField.get(timeFieldName)?.set(representativeIndex, timestamps);
      }
    }

    preparedByLayerId.set(layerConfig.id, {
      data,
      pathByIndex,
      numericArrayByField,
    });
  }

  return preparedByLayerId;
}
