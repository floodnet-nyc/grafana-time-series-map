import type { Layer } from '@deck.gl/core';
import type { LayerMaterialConfig, LayerExtensionDefinition } from '../types';
import { getLayerDefaultProps, getLayerProps } from '../utils';

const DEFAULT_SPECULAR_COLOR: [number, number, number, number] = [51, 51, 51, 255];

function rgbColor(value: unknown): [number, number, number] {
  const color = Array.isArray(value) ? value : DEFAULT_SPECULAR_COLOR;
  return [
    Number(color[0] ?? DEFAULT_SPECULAR_COLOR[0]) / 255,
    Number(color[1] ?? DEFAULT_SPECULAR_COLOR[1]) / 255,
    Number(color[2] ?? DEFAULT_SPECULAR_COLOR[2]) / 255,
  ];
}

function supportsMaterial(layer: Layer): boolean {
  const props = getLayerProps(layer);
  const defaultProps = getLayerDefaultProps(layer);
  return 'material' in props || 'material' in defaultProps;
}

export function createDefaultMaterialConfig(): LayerMaterialConfig {
  return {
    enabled: false,
    ambient: 0.64,
    diffuse: 0.6,
    shininess: 32,
    specularColor: DEFAULT_SPECULAR_COLOR,
  };
}

export const materialExtensionDefinition: LayerExtensionDefinition = {
  id: 'material',
  createDefaults: createDefaultMaterialConfig,
  editorSections: [
    {
      title: 'Material',
      fields: [
        { key: 'enabled', label: 'Override material', type: 'boolean', defaultValue: false },
        { key: 'ambient', label: 'Ambient', type: 'number', defaultValue: 0.64, min: 0, max: 1, step: 0.01 },
        { key: 'diffuse', label: 'Diffuse', type: 'number', defaultValue: 0.6, min: 0, max: 1, step: 0.01 },
        { key: 'shininess', label: 'Shininess', type: 'number', defaultValue: 32 },
        { key: 'specularColor', label: 'Specular color', type: 'color', defaultValue: DEFAULT_SPECULAR_COLOR },
      ],
    },
  ],
  apply(layer, config) {
    const options = config.extensions?.material;
    if (!options?.enabled || !supportsMaterial(layer)) {
      return layer;
    }

    return layer.clone({
      material: {
        ambient: options.ambient,
        diffuse: options.diffuse,
        shininess: options.shininess,
        specularColor: rgbColor(options.specularColor),
      },
    } as any);
  },
};
