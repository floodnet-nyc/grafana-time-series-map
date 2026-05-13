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
  return layerExtensionDefinitions.reduce((acc, { id, createDefaults }) => {
    acc[id] = createDefaults();
    return acc;
  }, {} as Record<string, unknown>) as LayerExtensionsConfig;
}

