import type { LayerRenderer } from './types';
import { getExtensionDefaultOptions, getExtensionOptionsSchema } from './extensions/registry';

const registry = new Map<string, LayerRenderer>();

function withRegisteredExtensions(renderer: LayerRenderer): LayerRenderer {
  return {
    ...renderer,
    defaultOptions: {
      ...renderer.defaultOptions,
      ...getExtensionDefaultOptions(),
    },
    optionsSchema: [
      ...renderer.optionsSchema,
      ...getExtensionOptionsSchema(),
    ],
  };
}

export function registerLayer(renderer: LayerRenderer): void {
  registry.set(renderer.type, renderer);
}

export function getLayer(type: string): LayerRenderer | undefined {
  const renderer = registry.get(type);
  return renderer ? withRegisteredExtensions(renderer) : undefined;
}

export function getAllLayerTypes(): LayerRenderer[] {
  return Array.from(registry.values()).map(withRegisteredExtensions);
}
