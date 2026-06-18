import type { AccessorContext, AccessorFunction } from '@deck.gl/core';
import type { Geometry, LineString, MultiLineString, MultiPolygon, Point, Polygon } from 'geojson';
import type { LayerConfig } from '../../../layers';
import type {
  GetAccessorFunction,
  GetAccessorFunctions,
  PointPositionAccessorFunction,
  TypedGetAccessorFunction,
} from '../../../layers/types';
import type { SourceRef } from '../../../types';
import type { DerivedValueTable } from './derivedFieldSelectors';
import type { PreparedGroupedVectorsState } from './vectorSelectors';
import { getRowGeometry, getRowValue, type LayerTable, type LayerDatum } from '../layerTable';

function getDatumIndex(datum: LayerDatum, ctx: AccessorContext<LayerDatum>) {
  return datum.__idx ?? ctx.index;
}

function dependencyKey(fieldRef?: SourceRef, defaultValue?: unknown) {
  return [fieldRef?.source ?? '', fieldRef?.field ?? '', defaultValue];
}

function getFeatureFieldValue(
  table: LayerTable,
  index: number,
  fieldRef: SourceRef | undefined,
  featureSourceId: string,
  derived?: Record<string, unknown>
) {
  if (!fieldRef?.field) {
    return undefined;
  }
  if (fieldRef.source !== featureSourceId) {
    return undefined;
  }
  return derived?.[fieldRef.field] ?? getRowValue(table, index, fieldRef.field);
}

function makeTypedGetAccessor<O>(
  raw: GetAccessorFunction,
  toTyped: (raw: unknown, defaultValue: O) => O,
  defaultValue: O
) {
  return ((fieldRef, defaultVal) => {
    const resolvedDefault = (defaultVal ?? defaultValue) as O;
    const [accessor, updates] = raw(fieldRef, resolvedDefault);
    return [
      accessor
        ? (datum: LayerDatum, ctx: AccessorContext<LayerDatum>) => toTyped(accessor(datum, ctx), resolvedDefault)
        : undefined,
      updates,
    ] as [AccessorFunction<LayerDatum, O> | undefined, readonly unknown[]];
  }) as TypedGetAccessorFunction<O>;
}

function toNumber(raw: unknown, defaultValue: number): number {
  if (typeof raw === 'number') {
    return Number.isFinite(raw) ? raw : defaultValue;
  }
  const n = Number(raw);
  return Number.isFinite(n) ? n : defaultValue;
}

function toArray(raw: unknown, defaultValue: unknown[]): unknown[] {
  if (Array.isArray(raw)) {
    return raw;
  }
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (!trimmed) {
      return [];
    }
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    } catch {
      return trimmed.split(',').map((item) => item.trim());
    }
    return trimmed.split(',').map((item) => item.trim());
  }
  return defaultValue;
}

function toNumericArray(raw: unknown, defaultValue: number[]): number[] {
  const arr = toArray(raw, defaultValue);
  return arr.map((item) => toNumber(item, NaN));
}

function toDate(raw: unknown, defaultValue: Date): Date {
  if (raw instanceof Date) {
    return raw;
  }
  const d = new Date(raw as any);
  return isNaN(d.getTime()) ? defaultValue : d;
}

function toDateMs(raw: unknown, defaultValue: number): number {
  if (raw instanceof Date) {
    return raw.getTime();
  }
  const n = Number(raw);
  return Number.isFinite(n) ? n : defaultValue;
}

function getPointPositionFromGeometry(
  geometry: Geometry | null,
  defaultValue: [number, number] | [number, number, number],
  elevation?: number,
  elevationOffset = 0
): [number, number] | [number, number, number] {
  const [defaultLng = 0, defaultLat = 0, defaultZ] = defaultValue;
  const fallbackZ = (defaultZ ?? 0) + elevationOffset;

  if (geometry?.type === 'Point') {
    const [lng = defaultLng, lat = defaultLat, rawZ] = geometry.coordinates as Point['coordinates'];
    if (typeof elevation === 'number' && Number.isFinite(elevation)) {
      return [lng, lat, elevation + elevationOffset];
    }
    if (typeof rawZ === 'number' && Number.isFinite(rawZ)) {
      return [lng, lat, rawZ + elevationOffset];
    }
    if (defaultValue.length > 2 || elevationOffset !== 0) {
      return [lng, lat, fallbackZ];
    }
    return [lng, lat];
  }

  if (typeof elevation === 'number' && Number.isFinite(elevation)) {
    return [defaultLng, defaultLat, elevation + elevationOffset];
  }
  if (defaultValue.length > 2 || elevationOffset !== 0) {
    return [defaultLng, defaultLat, fallbackZ];
  }

  return defaultValue;
}

function getPathFromGeometry(geometry: Geometry | null, defaultValue: number[][]): number[][] {
  if (geometry?.type === 'LineString') {
    return geometry.coordinates as LineString['coordinates'];
  }
  if (geometry?.type === 'MultiLineString') {
    return (geometry.coordinates[0] ?? defaultValue) as MultiLineString['coordinates'][number];
  }
  return defaultValue;
}

function getPolygonFromGeometry(geometry: Geometry | null, defaultValue: number[][][]): number[][][] {
  if (geometry?.type === 'Polygon') {
    return geometry.coordinates as Polygon['coordinates'];
  }
  if (geometry?.type === 'MultiPolygon') {
    return (geometry.coordinates[0] ?? defaultValue) as MultiPolygon['coordinates'][number];
  }
  return defaultValue;
}

export function selectAccessorFactories({
  config,
  table,
  derivedValues,
  joinedSourceValues,
  groupedVectors,
}: {
  config: LayerConfig;
  table: LayerTable;
  derivedValues?: DerivedValueTable;
  joinedSourceValues?: Map<string, Map<string, Record<string, unknown>>>;
  groupedVectors?: PreparedGroupedVectorsState;
}): { getAccessor: GetAccessorFunction; getAccessors: GetAccessorFunctions } {
  const derivedFieldNames = new Set((config.derivedFields ?? []).map((f) => f.as).filter(Boolean));

  const rawGetAccessor = ((fieldRef?: SourceRef, defaultValue?: unknown) => {
    if (!fieldRef?.field) {
      return [undefined, []];
    }

    if (fieldRef.source === config.data.featureSource.id && derivedFieldNames.has(fieldRef.field)) {
      return [
        (datum: LayerDatum, ctx: AccessorContext<LayerDatum>) =>
          derivedValues?.[getDatumIndex(datum, ctx)]?.[fieldRef.field] ?? defaultValue,
        [...dependencyKey(fieldRef, defaultValue), derivedValues],
      ];
    }

    if (fieldRef.source === config.data.featureSource.id) {
      return [
        (datum: LayerDatum, ctx: AccessorContext<LayerDatum>) =>
          getRowValue(table, getDatumIndex(datum, ctx), fieldRef.field) ?? defaultValue,
        dependencyKey(fieldRef, defaultValue),
      ];
    }

    if (joinedSourceValues?.has(fieldRef.source)) {
      const joinedSource = config.data.joinedSources?.find((s) => s.id === fieldRef.source);
      const sourceValues = joinedSourceValues.get(fieldRef.source);
      if (!joinedSource || !sourceValues) {
        return [undefined, dependencyKey(fieldRef, defaultValue)];
      }

      return [
        (datum: LayerDatum, ctx: AccessorContext<LayerDatum>) => {
          const index = getDatumIndex(datum, ctx);
          const localKey = String(
            getFeatureFieldValue(
              table,
              index,
              joinedSource.join.localKey,
              config.data.featureSource.id,
              derivedValues?.[index]
            ) ?? ''
          );
          return sourceValues.get(localKey)?.[fieldRef.field] ?? defaultValue;
        },
        [...dependencyKey(fieldRef, defaultValue), joinedSource.join.localKey.source, joinedSource.join.localKey.field, sourceValues],
      ];
    }

    return [undefined, dependencyKey(fieldRef, defaultValue)];
  }) as GetAccessorFunction;

  return {
    getAccessor: rawGetAccessor,
    getAccessors: {
      number: makeTypedGetAccessor(rawGetAccessor, toNumber, 0),
      date: makeTypedGetAccessor(rawGetAccessor, toDate, new Date(NaN)),
      dateMs: makeTypedGetAccessor(rawGetAccessor, toDateMs, 0),
      array: makeTypedGetAccessor(rawGetAccessor, toArray, []),
      numericArray: ((fieldRef?: SourceRef, defaultValue: number[] = []) => {
        const vectorFieldValues =
          fieldRef?.source === config.data.featureSource.id && fieldRef.field
            ? groupedVectors?.numericArrayByField.get(fieldRef.field)
            : undefined;
        const [accessor, updates] = rawGetAccessor(fieldRef, defaultValue);
        return [
          vectorFieldValues
            ? (datum: LayerDatum, ctx: AccessorContext<LayerDatum>) =>
                vectorFieldValues.get(getDatumIndex(datum, ctx)) ?? defaultValue
            : accessor
              ? (datum: LayerDatum, ctx: AccessorContext<LayerDatum>) =>
                  toNumericArray(accessor(datum, ctx), defaultValue)
              : undefined,
          [...updates, vectorFieldValues],
        ] as [AccessorFunction<LayerDatum, number[]> | undefined, readonly unknown[]];
      }) as TypedGetAccessorFunction<number[]>,
      geometry: (defaultValue = null) => [
        (datum, ctx) => getRowGeometry(table, getDatumIndex(datum, ctx)) ?? defaultValue,
        [table.geometry],
      ],
      pointPosition: ((defaultValue: [number, number] | [number, number, number] = [0, 0], getElevation, elevationOffset = 0) => [
        (datum, ctx) =>
          getPointPositionFromGeometry(
            getRowGeometry(table, getDatumIndex(datum, ctx)),
            defaultValue,
            getElevation?.(datum, ctx),
            elevationOffset
          ),
        [table.geometry],
      ]) as PointPositionAccessorFunction,
      path: (defaultValue: number[][] = []) => [
        (datum, ctx) =>
          groupedVectors?.pathByIndex.get(getDatumIndex(datum, ctx)) ??
          getPathFromGeometry(getRowGeometry(table, getDatumIndex(datum, ctx)), defaultValue),
        [table.geometry, groupedVectors?.pathByIndex],
      ],
      polygon: (defaultValue: number[][][] = []) => [
        (datum, ctx) => getPolygonFromGeometry(getRowGeometry(table, getDatumIndex(datum, ctx)), defaultValue),
        [table.geometry],
      ],
    },
  };
}
