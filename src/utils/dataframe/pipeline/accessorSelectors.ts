import type { AccessorContext, AccessorFunction } from '@deck.gl/core';
import type { Feature } from 'geojson';
import type { LayerConfig } from '../../../layers';
import type {
  GetAccessorFunction,
  GetAccessorFunctions,
  TypedGetAccessorFunction,
} from '../../../layers/types';
import type { SourceRef } from '../../../types';
import type { DerivedValueTable } from './derivedFieldSelectors';

function dependencyKey(fieldRef?: SourceRef, defaultValue?: unknown) {
  return [fieldRef?.source ?? '', fieldRef?.field ?? '', defaultValue];
}

function getFeatureFieldValue(
  feature: Feature,
  fieldRef: SourceRef | undefined,
  featureSourceId: string,
  derived?: Record<string, unknown>,
) {
  if (!fieldRef?.field) {
    return undefined;
  }
  if (fieldRef.source !== featureSourceId) {
    return undefined;
  }
  return derived?.[fieldRef.field] ?? feature.properties?.[fieldRef.field];
}

function makeTypedGetAccessor<O>(
  raw: GetAccessorFunction,
  toTyped: (raw: unknown, defaultValue: O) => O,
  defaultValue: O,
) {
  return ((fieldRef, defaultVal) => {
    const resolvedDefault = (defaultVal ?? defaultValue) as O;
    const [accessor, updates] = raw(fieldRef, resolvedDefault);
    return [
      accessor
        ? (feature: Feature, ctx: AccessorContext<Feature>) => toTyped(accessor(feature, ctx), resolvedDefault)
        : undefined,
      updates,
    ] as [AccessorFunction<Feature, O> | undefined, readonly unknown[]];
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

export function selectAccessorFactories({
  config,
  derivedValues,
  joinedSourceValues,
}: {
  config: LayerConfig;
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
        (_feature: Feature, { index }: AccessorContext<Feature>) =>
          derivedValues?.[index]?.[fieldRef.field] ?? defaultValue,
        dependencyKey(fieldRef, defaultValue),
      ];
    }

    if (fieldRef.source === config.data.featureSource.id) {
      return [
        (feature: Feature) => feature.properties?.[fieldRef.field] ?? defaultValue,
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
        (feature: Feature, { index }: AccessorContext<Feature>) => {
          const localKey = String(
            getFeatureFieldValue(
              feature,
              joinedSource.join.localKey,
              config.data.featureSource.id,
              derivedValues?.[index],
            ) ?? '',
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
    },
  };
}
