import type { Layer } from '@deck.gl/core';
import type { Feature } from 'geojson';
import { getExtensionDefinition } from '../../../extensions';
import { getLayerDefinition as resolveLayerDefinition, type LayerConfig } from '../../../layers';
import type { FeaturePickingInfo, LayerDefinition, LayerRenderContext } from '../../../layers/types';
import type { MapPanelOptions } from '../../../types';
import type { PreparedLayerState } from './preparedLayerSelectors';

interface RenderPreparedLayersArgs {
  preparedLayerStates: PreparedLayerState[];
  options: MapPanelOptions;
  cursorTimeMs: number;
  fromTimeMs: number;
  toTimeMs: number;
  selectedKey: string | null;
  onFeatureClick?: (feature: Feature, info: FeaturePickingInfo) => void;
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
  onFeatureClick?: (feature: Feature, info: FeaturePickingInfo) => void;
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
    getAccessors: preparedLayerState.getAccessors,
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
