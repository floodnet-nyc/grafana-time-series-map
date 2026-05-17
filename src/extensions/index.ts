import type { LayerExtensionInstance } from './types';
import { blendingExtensionDefinition } from './blending';
import { collisionExtensionDefinition } from './collision';
import { materialExtensionDefinition } from './material';

export const layerExtensionDefinitions = [
  blendingExtensionDefinition,
  collisionExtensionDefinition,
  materialExtensionDefinition,
];

const definitionsById = new Map(layerExtensionDefinitions.map((d) => [d.id, d]));

export function getExtensionDefinition(id: string) {
  return definitionsById.get(id);
}

export function createDefaultLayerExtensions(): LayerExtensionInstance[] {
  return [];
}

