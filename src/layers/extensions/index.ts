import type { LayerExtensionsConfig } from './types';
import { blendingExtensionDefinition } from './blending';
import { collisionExtensionDefinition } from './collision';
import { materialExtensionDefinition } from './material';

export const layerExtensionDefinitions = [
  blendingExtensionDefinition,
  collisionExtensionDefinition,
  materialExtensionDefinition,
];

export function createDefaultLayerExtensions(): LayerExtensionsConfig {
  // return {
  //   blending: createDefaultBlendingConfig(),
  //   collision: createDefaultCollisionConfig(),
  //   material: createDefaultMaterialConfig(),
  // };
  return layerExtensionDefinitions.reduce((acc, { id, createDefaults }) => {
    acc[id] = createDefaults() as NonNullable<LayerExtensionsConfig>[keyof NonNullable<LayerExtensionsConfig>];
    return acc;
  }, {} as LayerExtensionsConfig);
}


