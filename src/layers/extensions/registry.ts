import type { Layer } from '@deck.gl/core';
import type { LayerConfig } from '../../types';
import type { LayerOptionField } from '../types';

export interface RegisteredLayerExtension {
  id: string;
  defaultOptions: Record<string, unknown>;
  optionsSchema: LayerOptionField[];
  apply: (layer: Layer, config: LayerConfig) => Layer;
}

const registry: RegisteredLayerExtension[] = [];

export function registerLayerExtension(extension: RegisteredLayerExtension): void {
  registry.push(extension);
}

export function getExtensionDefaultOptions(): Record<string, unknown> {
  return registry.reduce(
    (acc, extension) => ({ ...acc, ...extension.defaultOptions }),
    {} as Record<string, unknown>,
  );
}

export function getExtensionOptionsSchema(): LayerOptionField[] {
  return registry.flatMap((extension) => extension.optionsSchema);
}

export function getExtensionOptionKeys(): string[] {
  return registry.flatMap((extension) => extension.optionsSchema.map((field) => field.key));
}

export function appendDeckExtension(layer: Layer, extension: unknown) {
  const props = (layer as any).props ?? {};
  const existing = props.extensions ?? [];
  const extensionName = (extension as any).constructor?.extensionName ?? (extension as any).constructor?.name;
  const hasExtension = existing.some((item: any) => {
    const itemName = item?.constructor?.extensionName ?? item?.constructor?.name;
    return itemName === extensionName;
  });
  return hasExtension ? existing : [...existing, extension];
}

export function applyLayerExtensions(layers: Layer[], config: LayerConfig): Layer[] {
  return layers.map((layer) => registry.reduce((current, extension) => extension.apply(current, config), layer));
}
