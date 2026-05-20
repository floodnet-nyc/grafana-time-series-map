import type { DataFrame } from '@grafana/data';
import type { Layer, AccessorContext } from '@deck.gl/core';
import type { Feature } from 'geojson';
import { getExtensionDefinition } from '../../extensions';
import { getLayerDefinition as resolveLayerDefinition, type LayerConfig } from '../../layers/_all';
import type { GetAccessorFunction, GetNumericAccessorFunction, LayerDefinition, LayerRenderContext } from '../../layers/types';
import type { JoinedSourceConfig, MapPanelOptions, SourceRef } from '../../types';
import { compileExpression } from './derivedFields/expressionEngine';
import { buildFeatureScope } from './featureScope';
import { dataFramesToFeatures } from './toGeoJsonFeatures';
import { buildPackedFromAccessors, computeClosestFlags, resolveAsofLookup } from './closestTimeFiltering';
import type { PanelFeaturesByLayerId } from '../../hooks/usePanelLayers';

type PackedLookupEntry = {
  features: Feature[];
  packed: ReturnType<typeof buildPackedFromAccessors>;
};

export interface PreparedLayerState {
  config: LayerConfig;
  features: Feature[];
  timeFilterFlags: Uint8Array;
  joinedSourceValues?: Map<string, Map<string, Record<string, unknown>>>;
  derivedValues?: Array<Record<string, unknown>>;
  getAccessor: GetAccessorFunction;
  getNumericAccessor: GetNumericAccessorFunction;
}

function getJoinedSources(layerConfig: LayerConfig): JoinedSourceConfig[] {
  return layerConfig.data.joinedSources ?? [];
}

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

export function buildTimePackedByLayerId(layerConfigs: LayerConfig[], featuresByLayerId: PanelFeaturesByLayerId) {
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

export function buildTimeFilterFlagsByLayerId(
  layerConfigs: LayerConfig[],
  featuresByLayerId: PanelFeaturesByLayerId,
  packedByLayerId: Map<string, ReturnType<typeof buildPackedFromAccessors>>,
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

export function buildPreparedLayerStates(
  layerConfigs: LayerConfig[],
  featuresByLayerId: PanelFeaturesByLayerId,
  flagsByLayerId: Map<string, Uint8Array>,
  joinedSourceValuesByLayerId: Map<string, Map<string, Map<string, Record<string, unknown>>>> = new Map(),
): PreparedLayerState[] {
  return layerConfigs.map((config) => {
    const features = featuresByLayerId.get(config.id) ?? [];
    const timeFilterFlags = flagsByLayerId.get(config.id) ?? new Uint8Array(features.length);
    const joinedSourceValues = joinedSourceValuesByLayerId.get(config.id);
    const derivedFields = compileDerivedFields(config);
    const derivedValues = buildDerivedValues(derivedFields, config, features, joinedSourceValues);
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
      config,
      features,
      timeFilterFlags,
      joinedSourceValues,
      derivedValues,
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
  });
}

interface RenderPreparedLayersArgs {
  preparedLayerStates: PreparedLayerState[];
  options: MapPanelOptions;
  cursorTimeMs: number;
  fromTimeMs: number;
  toTimeMs: number;
  selectedKey: string | null;
  onFeatureClick?: (feature: Feature, info: any) => void;
  getRenderer?: (type: string) => LayerDefinition<any> | undefined;
  applyExtensions?: (layers: Layer[], config: LayerConfig) => Layer[];
}

export function renderPreparedLayers({
  preparedLayerStates,
  options,
  cursorTimeMs,
  fromTimeMs,
  toTimeMs,
  selectedKey,
  onFeatureClick,
  getRenderer = resolveConfiguredLayerDefinition,
  applyExtensions = applyConfiguredLayerExtensions,
}: RenderPreparedLayersArgs): Layer[] {
  const renderedLayers: Layer[] = [];

  for (const preparedLayerState of preparedLayerStates) {
    if (!preparedLayerState.config.visible) {
      continue;
    }

    const renderer = getRenderer(preparedLayerState.config.type);
    if (!renderer) {
      continue;
    }

    const renderContext: LayerRenderContext = {
      config: preparedLayerState.config,
      panelOptions: options,
      features: preparedLayerState.features,
      cursorTimeMs,
      fromTimeMs,
      toTimeMs,
      timeFilterFlags: preparedLayerState.timeFilterFlags,
      joinedSourceValues: preparedLayerState.joinedSourceValues,
      derivedValues: preparedLayerState.derivedValues,
      getAccessor: preparedLayerState.getAccessor,
      getNumericAccessor: preparedLayerState.getNumericAccessor,
      selectedKey,
      onFeatureClick,
    };

    const layers = applyExtensions(renderer.renderLayers(renderContext), preparedLayerState.config);
    renderedLayers.push(...layers);
  }

  return renderedLayers;
}

function resolveConfiguredLayerDefinition(type: string) {
  return resolveLayerDefinition(type);
}

function applyConfiguredLayerExtensions(layers: Layer[], config: LayerConfig) {
  return applyLayerExtensions(layers, config.extensions ?? []);
}

function applyLayerExtensions(layers: Layer[], extensions: LayerConfig['extensions']): Layer[] {
  return layers.map((layer) => {
    if (!extensions) {
      return layer;
    }
    return extensions.reduce((current, instance) => {
      const def = getExtensionDefinition(instance.type);
      return def ? def.apply(current, instance.config as any) : current;
    }, layer);
  });
}

export function compileDerivedFields(config: LayerConfig) {
  if (!config.derivedFields?.length) {
    return [];
  }

  return config.derivedFields.flatMap((derivedField) => {
    try {
      return [{ as: derivedField.as, evaluate: compileExpression(derivedField.expression) }];
    } catch (error) {
      console.warn(`[timeseriesmap] Failed to compile derived field "${derivedField.as}":`, error);
      return [];
    }
  });
}

function buildDerivedValues(
  compiledDerivedFields: ReturnType<typeof compileDerivedFields>,
  config: LayerConfig,
  features: Feature[],
  joinedSourceValues?: Map<string, Map<string, Record<string, unknown>>>,
): Array<Record<string, unknown>> | undefined {
  if (!compiledDerivedFields?.length) {
    return undefined;
  }

  return features.map((feature, index) => {
    const derived: Record<string, unknown> = {};
    (feature as Feature & { __derived?: Record<string, unknown> }).__derived = derived;

    for (const derivedField of compiledDerivedFields) {
      try {
        const scope = buildFeatureScope(config, feature, joinedSourceValues, derived);
        derived[derivedField.as] = derivedField.evaluate({
          ...scope,
          derived,
          index,
        });
      } catch (error) {
        console.warn(`[timeseriesmap] Error evaluating derived field "${derivedField.as}":`, error);
      }
    }

    return derived;
  });
}
