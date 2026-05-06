import type { LayerRenderer } from './types';

const registry = new Map<string, LayerRenderer>();

export function registerLayer(renderer: LayerRenderer): void {
  registry.set(renderer.type, renderer);
}

export function getLayer(type: string): LayerRenderer | undefined {
  return registry.get(type);
}

export function getAllLayerTypes(): LayerRenderer[] {
  return Array.from(registry.values());
}
