import type { LayerRenderer } from './types';
import { getExtensionDefaultOptions, getExtensionOptionKeys, getExtensionOptionsSchema } from './extensions/registry';

const registry = new Map<string, LayerRenderer<any>>();

function withRegisteredExtensions<TOptions extends object>(renderer: LayerRenderer<TOptions>): LayerRenderer<TOptions> {
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

export function registerLayer<TOptions extends object>(renderer: LayerRenderer<TOptions>): void {
  registry.set(renderer.type, renderer);
}

export function getLayer(type: string): LayerRenderer<any> | undefined {
  const renderer = registry.get(type);
  return renderer ? withRegisteredExtensions(renderer) : undefined;
}

export function getAllLayerTypes(): Array<LayerRenderer<any>> {
  return Array.from(registry.values()).map(withRegisteredExtensions);
}

export function resolveLayerOptions(type: string, options?: Record<string, unknown>): Record<string, unknown> {
  const renderer = getLayer(type);
  return renderer ? { ...renderer.defaultOptions, ...(options ?? {}) } : { ...(options ?? {}) };
}

export function extractSharedLayerOptions(options?: Record<string, unknown>): Record<string, unknown> {
  if (!options) {
    return {};
  }

  const sharedOptionKeys = new Set(getExtensionOptionKeys());
  return Object.fromEntries(Object.entries(options).filter(([key]) => sharedOptionKeys.has(key)));
}
