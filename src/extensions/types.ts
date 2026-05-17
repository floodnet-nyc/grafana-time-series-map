import type { Layer } from '@deck.gl/core';
import type { DeckBlendFactor, DeckBlendOperation } from '../types';
import type { LayerEditorSection } from '../layers/types';

export interface LayerBlendingConfig {
  enabled: boolean;
  blend: boolean;
  colorOperation: DeckBlendOperation;
  colorSrcFactor: DeckBlendFactor;
  colorDstFactor: DeckBlendFactor;
  alphaOperation: DeckBlendOperation;
  alphaSrcFactor: DeckBlendFactor;
  alphaDstFactor: DeckBlendFactor;
}

export interface LayerMaterialConfig {
  enabled: boolean;
  ambient: number;
  diffuse: number;
  shininess: number;
  specularColor: [number, number, number, number];
}

export interface LayerCollisionConfig {
  enabled: boolean;
  group: string;
  priorityField: string;
  priorityScale: number;
  priorityOffset: number;
  testScale: number;
}

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
