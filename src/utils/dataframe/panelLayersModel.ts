import type { Layer, AccessorContext } from '@deck.gl/core';
import type { Feature } from 'geojson';
import { getExtensionDefinition } from '../../extensions';
import { getLayerDefinition as resolveLayerDefinition, type LayerConfig } from '../../layers';
import type { GetAccessorFunction, GetNumericAccessorFunction, LayerDefinition, LayerRenderContext } from '../../layers/types';
import type { MapPanelOptions, SourceRef } from '../../types';
import { compileExpression } from './derivedFields/expressionEngine';
import { buildFeatureScope } from './featureScope';
import type { PanelFeaturesByLayerId } from '../../hooks/usePanelLayers';

export { buildTimeFilterFlagsByLayerId, buildTimePackedByLayerId } from './pipeline/timeSelectors';
export { buildJoinedSourcePackedByLayerId, buildJoinedSourceValuesByLayerId } from './pipeline/joinSelectors';

export interface PreparedLayerState {
  config: LayerConfig;
  features: Feature[];
  timeFilterFlags: Uint8Array;
  joinedSourceValues?: Map<string, Map<string, Record<string, unknown>>>;
  derivedValues?: Array<Record<string, unknown>>;
  getAccessor: GetAccessorFunction;
  getNumericAccessor: GetNumericAccessorFunction;
}

type DerivedFieldSet = ReturnType<typeof compileDerivedFields>;
type DerivedValueRow = Record<string, unknown>;
type DerivedValueTable = DerivedValueRow[] | undefined;

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

export function buildPreparedLayerStates(
  layerConfigs: LayerConfig[],
  featuresByLayerId: PanelFeaturesByLayerId,
  flagsByLayerId: Map<string, Uint8Array>,
  joinedSourceValuesByLayerId: Map<string, Map<string, Map<string, Record<string, unknown>>>> = new Map(),
): PreparedLayerState[] {
  return layerConfigs.map((config) =>
    selectPreparedLayerState({
      config,
      features: featuresByLayerId.get(config.id) ?? [],
      timeFilterFlags: flagsByLayerId.get(config.id) ?? new Uint8Array((featuresByLayerId.get(config.id) ?? []).length),
      joinedSourceValues: joinedSourceValuesByLayerId.get(config.id),
    })
  );
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

export function selectDerivedValues(
  compiledDerivedFields: DerivedFieldSet,
  config: LayerConfig,
  features: Feature[],
  joinedSourceValues?: Map<string, Map<string, Record<string, unknown>>>,
): DerivedValueTable {
  if (!compiledDerivedFields?.length) {
    return undefined;
  }

  return features.map((feature, index) => {
    const derivedRow: DerivedValueRow = {};

    for (const derivedField of compiledDerivedFields) {
      try {
        const scope = buildFeatureScope({
          config,
          feature,
          joinedSourceValues,
          derivedRow,
        });
        derivedRow[derivedField.as] = derivedField.evaluate({
          ...scope,
          derived: derivedRow,
          index,
        });
      } catch (error) {
        console.warn(`[timeseriesmap] Error evaluating derived field "${derivedField.as}":`, error);
      }
    }

    return derivedRow;
  });
}

export function selectAccessorFactories({
  config,
  derivedValues,
  joinedSourceValues,
}: {
  config: LayerConfig;
  derivedValues?: DerivedValueTable;
  joinedSourceValues?: Map<string, Map<string, Record<string, unknown>>>;
}): Pick<PreparedLayerState, 'getAccessor' | 'getNumericAccessor'> {
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

export function selectPreparedLayerState({
  config,
  features,
  timeFilterFlags,
  joinedSourceValues,
}: {
  config: LayerConfig;
  features: Feature[];
  timeFilterFlags: Uint8Array;
  joinedSourceValues?: Map<string, Map<string, Record<string, unknown>>>;
}): PreparedLayerState {
  const derivedFields = compileDerivedFields(config);
  const derivedValues = selectDerivedValues(derivedFields, config, features, joinedSourceValues);
  const accessors = selectAccessorFactories({ config, derivedValues, joinedSourceValues });

  return {
    config,
    features,
    timeFilterFlags,
    joinedSourceValues,
    derivedValues,
    ...accessors,
  };
}
