import type { AccessorContext, AccessorFunction } from '@deck.gl/core';
import type { Geometry, LineString, MultiLineString, MultiPolygon, Point, Polygon } from 'geojson';
import type { LayerConfig } from '../../../layers';
import type { GetAccessorFunction, GetAccessorFunctions, TypedGetAccessorFunction } from '../../../layers/types';
import type { SourceRef } from '../../../types';
import type { DerivedValueTable } from './derivedFieldSelectors';
import { getRowGeometry, getRowValue, type LayerTable, type LayerDatum } from '../layerTable';

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

function getPointPositionFromGeometry(geometry: Geometry | null, defaultValue: [number, number]): [number, number] {
  if (geometry?.type === 'Point') {
    const [lng = defaultValue[0], lat = defaultValue[1]] = geometry.coordinates as Point['coordinates'];
    return [lng, lat];
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
}: {
  config: LayerConfig;
  table: LayerTable;
  derivedValues?: DerivedValueTable;
  joinedSourceValues?: Map<string, Map<string, Record<string, unknown>>>;
}): { getAccessor: GetAccessorFunction; getAccessors: GetAccessorFunctions } {
  const derivedFieldNames = new Set((config.derivedFields ?? []).map((f) => f.as).filter(Boolean));

  const rawGetAccessor = ((fieldRef?: SourceRef, defaultValue?: unknown) => {
    if (!fieldRef?.field) {
      return [undefined, []];
    }

    if (fieldRef.source === config.data.featureSource.id && derivedFieldNames.has(fieldRef.field)) {
      return [
        (_datum: LayerDatum, { index }: AccessorContext<LayerDatum>) =>
          derivedValues?.[index]?.[fieldRef.field] ?? defaultValue,
        [...dependencyKey(fieldRef, defaultValue), derivedValues],
      ];
    }

    if (fieldRef.source === config.data.featureSource.id) {
      return [
        (_datum: LayerDatum, { index }: AccessorContext<LayerDatum>) =>
          getRowValue(table, index, fieldRef.field) ?? defaultValue,
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
        (_datum: LayerDatum, { index }: AccessorContext<LayerDatum>) => {
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
        [...dependencyKey(fieldRef, defaultValue), joinedSource.join.localKey.source, joinedSource.join.localKey.field],
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
      numericArray: makeTypedGetAccessor(rawGetAccessor, toNumericArray, []),
      geometry: (defaultValue = null) => [
        (_datum, { index }) => getRowGeometry(table, index) ?? defaultValue,
        [table.geometry],
      ],
      pointPosition: (defaultValue: [number, number] = [0, 0]) => [
        (_datum, { index }) => getPointPositionFromGeometry(getRowGeometry(table, index), defaultValue),
        [table.geometry],
      ],
      path: (defaultValue: number[][] = []) => [
        (_datum, { index }) => getPathFromGeometry(getRowGeometry(table, index), defaultValue),
        [table.geometry],
      ],
      polygon: (defaultValue: number[][][] = []) => [
        (_datum, { index }) => getPolygonFromGeometry(getRowGeometry(table, index), defaultValue),
        [table.geometry],
      ],
    },
  };
}
