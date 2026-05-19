import type { DataFrame } from '@grafana/data';
import type { Layer, AccessorContext } from '@deck.gl/core';
import type { Feature } from 'geojson';
import { getExtensionDefinition } from '../../extensions';
import { layerDefinitions, type LayerConfig } from '../../layers/_all';
import type { GetAccessorFunction, GetNumericAccessorFunction, LayerDefinition, LayerRenderContext } from '../../layers/types';
import type { LayerSecondarySourceConfig, MapPanelOptions } from '../../types';
import { compileExpression } from './derivedFields/expressionEngine';
import { buildFeatureScope } from './featureScope';
import { dataFramesToFeatures } from './toGeoJsonFeatures';
import { buildPacked, computeClosestFlags, resolveAsofLookup } from './closestTimeFiltering';
import type { PanelFeaturesByLayerId } from '../../hooks/usePanelLayers';

type PackedLookupEntry = {
  features: Feature[];
  packed: ReturnType<typeof buildPacked>;
};

export interface PreparedLayerState {
  config: LayerConfig;
  features: Feature[];
  timeFilterFlags: Uint8Array;
  secondarySourceValues?: Map<string, Map<string, Record<string, number>>>;
  derivedValues?: Array<Record<string, unknown>>;
  getAccessor: GetAccessorFunction;
  getNumericAccessor: GetNumericAccessorFunction;
}

function getLayerSecondarySources(layerConfig: LayerConfig): LayerSecondarySourceConfig[] {
  return layerConfig.secondarySources ?? [];
}

export function buildTimePackedByLayerId(layerConfigs: LayerConfig[], featuresByLayerId: PanelFeaturesByLayerId) {
  const packedByLayerId = new Map<string, ReturnType<typeof buildPacked>>();

  for (const layerConfig of layerConfigs) {
    if (layerConfig.timeFilter.mode !== 'asof') {
      continue;
    }

    const features = featuresByLayerId.get(layerConfig.id) ?? [];
    const { timeField, groupByField = 'id' } = layerConfig.timeFilter;
    packedByLayerId.set(layerConfig.id, buildPacked('geojson', features, groupByField, timeField));
  }

  return packedByLayerId;
}

export function buildSecondarySourcePackedByLayerId(layerConfigs: LayerConfig[], series: DataFrame[]) {
  const packedByLayerId = new Map<string, Map<string, PackedLookupEntry>>();

  for (const layerConfig of layerConfigs) {
    const secondarySources = getLayerSecondarySources(layerConfig);
    if (secondarySources.length === 0) {
      continue;
    }

    const packedBySourceId = new Map<string, PackedLookupEntry>();

    for (const secondarySource of secondarySources) {
      if (secondarySource.join.type !== 'keyed-asof') {
        continue;
      }

      const features = dataFramesToFeatures(series, secondarySource.queryRefId, { type: 'none' }, undefined);
      packedBySourceId.set(secondarySource.queryRefId, {
        features,
        packed: buildPacked('geojson', features, secondarySource.join.remoteKeyField, secondarySource.join.timeField),
      });
    }

    if (packedBySourceId.size > 0) {
      packedByLayerId.set(layerConfig.id, packedBySourceId);
    }
  }

  return packedByLayerId;
}

export function buildSecondarySourceValuesByLayerId(
  layerConfigs: LayerConfig[],
  packedByLayerId: Map<string, Map<string, PackedLookupEntry>>,
  cursorTimeMs: number,
) {
  const valuesByLayerId = new Map<string, Map<string, Map<string, Record<string, number>>>>();

  for (const layerConfig of layerConfigs) {
    const secondarySources = getLayerSecondarySources(layerConfig);
    if (secondarySources.length === 0) {
      continue;
    }

    const packedBySourceId = packedByLayerId.get(layerConfig.id);
    if (!packedBySourceId) {
      continue;
    }

    const valuesBySourceId = new Map<string, Map<string, Record<string, number>>>();

    for (const secondarySource of secondarySources) {
      const entry = packedBySourceId.get(secondarySource.queryRefId);
      if (!entry || secondarySource.join.type !== 'keyed-asof') {
        continue;
      }

      valuesBySourceId.set(
        secondarySource.queryRefId,
        resolveAsofLookup(
          entry.features,
          entry.packed,
          secondarySource.fields,
          cursorTimeMs,
          secondarySource.join.maxLagMs,
        ),
      );
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
  packedByLayerId: Map<string, ReturnType<typeof buildPacked>>,
  cursorTimeMs: number,
  fromTimeMs: number,
  toTimeMs: number,
) {
  const flagsByLayerId = new Map<string, Uint8Array>();

  for (const layerConfig of layerConfigs) {
    const features = featuresByLayerId.get(layerConfig.id) ?? [];
    const { mode, timeField, maxLagMs } = layerConfig.timeFilter;

    if (mode === 'none' || !timeField) {
      flagsByLayerId.set(layerConfig.id, new Uint8Array(features.length).fill(1));
      continue;
    }

    if (mode === 'window') {
      const tolerance = layerConfig.timeFilter.windowToleranceMs ?? 0;
      const flags = new Uint8Array(features.length);

      features.forEach((feature, index) => {
        const raw = feature.properties?.[timeField];
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
  // data: PanelData,
  featuresByLayerId: PanelFeaturesByLayerId,
  flagsByLayerId: Map<string, Uint8Array>,
  // layerId -> refId -> key -> field -> value
  secondarySourceValuesByLayerId: Map<string, Map<string, Map<string, Record<string, number>>>> = new Map(),
): PreparedLayerState[] {
  return layerConfigs.map((config) => {
    if (config.id !== 'event-depth-2') config.visible = false; // --- IGNORE ---
    const features = featuresByLayerId.get(config.id) ?? [];
    const timeFilterFlags = flagsByLayerId.get(config.id) ?? new Uint8Array(features.length);
    const secondarySourceValues = secondarySourceValuesByLayerId.get(config.id);
    const derivedFields = compileDerivedFields(config);
    const derivedValues = buildDerivedValues(derivedFields, config, features, secondarySourceValues);
    console.log(config.id, { features, timeFilterFlags, secondarySourceValues, derivedValues });

    const getAccessor: GetAccessorFunction = (fieldName, defaultValue) => {
      if (!fieldName) {
        // console.log('Using default accessor for empty field name');
        return [undefined, []];
      }

      const derivedField = derivedFields?.find((f) => f.as === fieldName);
      if (derivedField) {
        console.log('Using derived field accessor for field', fieldName);
        return [(f: Feature, { index, ...ctx }: AccessorContext<Feature>) => derivedValues?.[index]?.[fieldName] ?? defaultValue, [fieldName, defaultValue]];
      }
      if (secondarySourceValues) {
        for (const [refId, sourceValues] of secondarySourceValues.entries()) {
          const secConfig = config.secondarySources?.find((s) => s.queryRefId === refId);
          if (secConfig) {
            const field = secConfig.fields.find((f) => f.sourceField === fieldName);
            if (field) {
              const localKeyField = secConfig.join.localKeyField;
              console.log('Using secondary source accessor for field', fieldName);
              return [(f: Feature, { index, ...ctx }: AccessorContext<Feature>) => {
                const localKey = String(f.properties?.[localKeyField] ?? '');
                const value = sourceValues.get(localKey)?.[fieldName];
                return value ?? defaultValue;
              }, [fieldName, defaultValue, secondarySourceValues]];
            }
          }
        }
      }
      console.log('Using primary accessor for field', fieldName);
      return [(f: Feature, ctx: AccessorContext<Feature>) => {
        // const feature = features[index];
        // if (!feature) return undefined;
        return f.properties?.[fieldName] ?? defaultValue;
      }, [fieldName, defaultValue]];
    };

    return {
      config,
      features,
      timeFilterFlags,
      secondarySourceValues,
      derivedValues,
      getAccessor,
      getNumericAccessor: (fieldName: string, defaultValue = 0) => {
        const [accessor, updates] = getAccessor(fieldName, defaultValue);
        return [accessor ? (f: Feature, ctx: AccessorContext<Feature>) => {
          const v = accessor(f, ctx);
          return typeof v === 'number' && Number.isFinite(v) ? v : defaultValue;
        } : undefined, updates];
      },
    }
  });
}


// export type AccessorContext<T> = {
//   /** The index of the current iteration */
//   index: number;
//   /** The value of the `data` prop */
//   data: LayerData<T>;
//   /** A pre-allocated array. The accessor function can optionally fill data into this array and return it,
//    * instead of creating a new array for every object. In some browsers this improves performance significantly
//    * by reducing garbage collection. */
//   target: number[];
// };

// /** Function that returns a value for each object. */
// export type AccessorFunction<In, Out> = (
//   /**
//    * The current element in the data stream.
//    *
//    * If `data` is an array or an iterable, the element of the current iteration is used.
//    * If `data` is a non-iterable object, this argument is always `null`.
//    * */
//   object: In,
//   /** Contextual information of the current element. */
//   objectInfo: AccessorContext<In>
// ) => Out;

// /** Either a uniform value for all objects, or a function that returns a value for each object. */
// export type Accessor<In, Out> = Out | AccessorFunction<In, Out>;


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
  getRenderer = getLayerDefinition,
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
      secondarySourceValues: preparedLayerState.secondarySourceValues,
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

function getLayerDefinition(type: string) {
  return layerDefinitions.find((definition) => definition.type === type);
}

function applyConfiguredLayerExtensions(layers: Layer[], config: LayerConfig) {
  return applyLayerExtensions(layers, config.extensions ?? []);
}

function applyLayerExtensions(layers: Layer[], extensions: LayerConfig['extensions']): Layer[] {
  return layers.map((layer) => {
    if (!extensions) return layer;
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
    } catch (e) {
      console.warn(`[timeseriesmap] Failed to compile derived field "${derivedField.as}":`, e);
      return [];
    }
  });
}

function buildDerivedValues(
  compiledDerivedFields: ReturnType<typeof compileDerivedFields>,
  config: LayerConfig,
  features: Feature[],
  secondarySourceValues?: Map<string, Map<string, Record<string, number>>>,
): Array<Record<string, unknown>> | undefined {
  if (!compiledDerivedFields?.length) {
    return undefined;
  }

  return features.map((feature) => {
    const scope = buildFeatureScope(config, feature, secondarySourceValues);
    const derived: Record<string, unknown> = {};
    (feature as Feature & { __derived?: Record<string, unknown> }).__derived = derived;

    for (const derivedField of compiledDerivedFields) {
      try {
        derived[derivedField.as] = derivedField.evaluate({
          ...scope,
          derived,
        });
      } catch (e) {
        console.warn(`[timeseriesmap] Error evaluating derived field "${derivedField.as}":`, e);
      }
    }

    return derived;
  });
}
