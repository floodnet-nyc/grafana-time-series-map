import type { LayerConfig, LayerType } from '../types';
import { layerExtensionDefinitions } from './extensions/_all';
import { layerDefinitions } from './_all';
import { applyLayerExtensions } from './extensions/registry';

export function getLayer(type: LayerType | string) {
  return layerDefinitions.find((definition) => definition.type === type);
}

export function getAllLayerTypes() {
  return layerDefinitions;
}

export function getAllLayerExtensions() {
  return layerExtensionDefinitions;
}

export function applyConfiguredLayerExtensions(layers: any[], config: LayerConfig) {
  return applyLayerExtensions(layers, config, layerExtensionDefinitions);
}
