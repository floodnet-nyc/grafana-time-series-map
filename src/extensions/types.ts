import type { Layer } from '@deck.gl/core';
import type { LayerEditorSection } from '../layers/types';

export interface LayerExtensionInstance {
  id: string;
  type: string;
  config: Record<string, unknown>;
}

export interface LayerExtensionDefinition<TConfig = Record<string, unknown>> {
  id: string;
  label: string;
  createDefaults: () => TConfig;
  editorSections: LayerEditorSection[];
  apply: (layer: Layer, config: TConfig) => Layer;
}
