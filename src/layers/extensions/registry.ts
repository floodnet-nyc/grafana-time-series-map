import type { Layer } from '@deck.gl/core';
import type { LayerConfig, LayerExtensionsConfig } from '../../types';
import type { LayerEditorSection } from '../types';

export interface LayerExtensionDefinition {
  id: keyof NonNullable<LayerExtensionsConfig>;
  createDefaults: () => NonNullable<LayerExtensionsConfig>[keyof NonNullable<LayerExtensionsConfig>];
  editorSections: LayerEditorSection[];
  apply: (layer: Layer, config: LayerConfig) => Layer;
}

export function appendDeckExtension(layer: Layer, extension: unknown) {
  const props = (layer as any).props ?? {};
  const existing = props.extensions ?? [];
  const extensionName = (extension as any).constructor?.extensionName ?? (extension as any).constructor?.name;
  const hasExtension = existing.some((item: any) => {
    const itemName = item?.constructor?.extensionName ?? item?.constructor?.name;
    return itemName === extensionName;
  });
  return hasExtension ? existing : [...existing, extension];
}

export function applyLayerExtensions(
  layers: Layer[],
  config: LayerConfig,
  definitions: LayerExtensionDefinition[],
): Layer[] {
  return layers.map((layer) => definitions.reduce((current, extension) => extension.apply(current, config), layer));
}
