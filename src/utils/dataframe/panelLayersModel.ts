import type { Layer } from '@deck.gl/core';
import type { Feature } from 'geojson';
import { getExtensionDefinition } from '../../extensions';
import { getLayerDefinition as resolveLayerDefinition, type LayerConfig } from '../../layers';
import type { GetAccessorFunction, GetNumericAccessorFunction, LayerDefinition, LayerRenderContext } from '../../layers/types';
import type { MapPanelOptions } from '../../types';
import type { PanelFeaturesByLayerId } from '../../hooks/usePanelLayers';
import {
  compileDerivedFields,
  selectDerivedValues,
} from './pipeline/derivedFieldSelectors';
import { selectAccessorFactories } from './pipeline/accessorSelectors';

export { buildTimeFilterFlagsByLayerId, buildTimePackedByLayerId } from './pipeline/timeSelectors';
export { buildJoinedSourcePackedByLayerId, buildJoinedSourceValuesByLayerId } from './pipeline/joinSelectors';
export { compileDerivedFields, selectDerivedValues } from './pipeline/derivedFieldSelectors';
export { selectAccessorFactories } from './pipeline/accessorSelectors';

export interface PreparedLayerState {
  config: LayerConfig;
  features: Feature[];
  timeFilterFlags: Uint8Array;
  joinedSourceValues?: Map<string, Map<string, Record<string, unknown>>>;
  derivedValues?: Array<Record<string, unknown>>;
  getAccessor: GetAccessorFunction;
  getNumericAccessor: GetNumericAccessorFunction;
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

    const layers = applyExtensions(
      renderer.renderLayers(
        createLayerRenderContext({
          preparedLayerState,
          options,
          cursorTimeMs,
          fromTimeMs,
          toTimeMs,
          selectedKey,
          onFeatureClick,
        })
      ),
      preparedLayerState.config
    );
    renderedLayers.push(...layers);
  }

  return renderedLayers;
}

function resolveConfiguredLayerDefinition(type: string) {
  return resolveLayerDefinition(type);
}

function createLayerRenderContext({
  preparedLayerState,
  options,
  cursorTimeMs,
  fromTimeMs,
  toTimeMs,
  selectedKey,
  onFeatureClick,
}: {
  preparedLayerState: PreparedLayerState;
  options: MapPanelOptions;
  cursorTimeMs: number;
  fromTimeMs: number;
  toTimeMs: number;
  selectedKey: string | null;
  onFeatureClick?: (feature: Feature, info: any) => void;
}): LayerRenderContext {
  return {
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
