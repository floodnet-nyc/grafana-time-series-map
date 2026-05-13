import type { Layer } from '@deck.gl/core';
import type { LayerEditorSection, LayerConfig } from 'layers/types';
import type { LayerExtensionsConfig } from 'types';
import { blendingExtensionDefinition } from './blending';
import { collisionExtensionDefinition } from './collision';
import { materialExtensionDefinition } from './material';

export const layerExtensionDefinitions = [
  blendingExtensionDefinition,
  collisionExtensionDefinition,
  materialExtensionDefinition,
];

export interface LayerExtensionDefinition {
  id: keyof NonNullable<LayerExtensionsConfig>;
  createDefaults: () => NonNullable<LayerExtensionsConfig>[keyof NonNullable<LayerExtensionsConfig>];
  editorSections: LayerEditorSection[];
  apply: (layer: Layer, config: LayerConfig) => Layer;
}

