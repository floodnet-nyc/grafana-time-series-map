import type { AccessorContext } from '@deck.gl/core';
import type { Feature } from 'geojson';
import type { LayerConfig } from '../../../layers';
import type { GetAccessorFunction, GetNumericAccessorFunction } from '../../../layers/types';
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

export function selectAccessorFactories({
  config,
  derivedValues,
  joinedSourceValues,
}: {
  config: LayerConfig;
  derivedValues?: DerivedValueTable;
  joinedSourceValues?: Map<string, Map<string, Record<string, unknown>>>;
}): { getAccessor: GetAccessorFunction; getNumericAccessor: GetNumericAccessorFunction } {
  const derivedFieldNames = new Set((config.derivedFields ?? []).map((field) => field.as).filter(Boolean));

  const getAccessor = ((fieldRef?: SourceRef, defaultValue?: unknown) => {
    if (!fieldRef?.field) {
      return [undefined, []];
    }

    if (fieldRef.source === config.data.featureSource.id && derivedFieldNames.has(fieldRef.field)) {
      return [
        (_feature: Feature, { index }: AccessorContext<Feature>) => derivedValues?.[index]?.[fieldRef.field] ?? defaultValue,
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
      const joinedSource = config.data.joinedSources?.find((source) => source.id === fieldRef.source);
      const sourceValues = joinedSourceValues.get(fieldRef.source);
      if (!joinedSource || !sourceValues) {
        return [undefined, dependencyKey(fieldRef, defaultValue)];
      }

      return [
        (feature: Feature, { index }: AccessorContext<Feature>) => {
          const localKey = String(
            getFeatureFieldValue(feature, joinedSource.join.localKey, config.data.featureSource.id, derivedValues?.[index]) ?? '',
          );
          return sourceValues.get(localKey)?.[fieldRef.field] ?? defaultValue;
        },
        [...dependencyKey(fieldRef, defaultValue), joinedSource.join.localKey.source, joinedSource.join.localKey.field],
      ];
    }

    return [undefined, dependencyKey(fieldRef, defaultValue)];
  }) as GetAccessorFunction;

  return {
    getAccessor,
    getNumericAccessor: (fieldRef, defaultValue = 0) => {
      const [accessor, updates] = getAccessor(fieldRef, defaultValue);
      return [
        accessor
          ? (feature: Feature, ctx: AccessorContext<Feature>) => {
              const value = accessor(feature, ctx);
              return typeof value === 'number' && Number.isFinite(value) ? value : defaultValue;
            }
          : undefined,
        updates,
      ];
    },
  };
}
