import type { default as Layer } from "@deck.gl/core";
import type { LayerEditorSection, LayerConfig } from "layers/types";
import { DeckBlendOperation, DeckBlendFactor } from "types";
import type { LayerExtensionsConfig } from "./types";

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

export interface LayerExtensionsConfig {
  blending?: LayerBlendingConfig;
  material?: LayerMaterialConfig;
  collision?: LayerCollisionConfig;
}export interface LayerExtensionDefinition {
  id: keyof NonNullable<LayerExtensionsConfig>;
  createDefaults: () => NonNullable<LayerExtensionsConfig>[keyof NonNullable<LayerExtensionsConfig>];
  editorSections: LayerEditorSection[];
  apply: (layer: Layer, config: LayerConfig) => Layer;
}

