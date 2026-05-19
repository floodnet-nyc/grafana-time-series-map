import { blendingExtensionDefinition } from './blending';
import { brushingExtensionDefinition } from './brushing';
import { collisionExtensionDefinition } from './collision';
import { materialExtensionDefinition } from './material';

export const layerExtensionDefinitions = [
  blendingExtensionDefinition,
  collisionExtensionDefinition,
  brushingExtensionDefinition,
  materialExtensionDefinition,
];

const definitionsById = new Map(layerExtensionDefinitions.map((d) => [d.id, d]));

export function getExtensionDefinition(id: string) {
  return definitionsById.get(id);
}
