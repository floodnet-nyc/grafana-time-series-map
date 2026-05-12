import { registerLayerExtension } from '../registry';
import { numericOption } from '../utils';

const DEFAULT_SPECULAR_COLOR: [number, number, number, number] = [51, 51, 51, 255];

function rgbColor(value: unknown): [number, number, number] {
  const color = Array.isArray(value) ? value : DEFAULT_SPECULAR_COLOR;
  return [
    Number(color[0] ?? DEFAULT_SPECULAR_COLOR[0]) / 255,
    Number(color[1] ?? DEFAULT_SPECULAR_COLOR[1]) / 255,
    Number(color[2] ?? DEFAULT_SPECULAR_COLOR[2]) / 255,
  ];
}

function supportsMaterial(layer: unknown): boolean {
  const props = (layer as any).props ?? {};
  const defaultProps = (layer as any).constructor?.defaultProps ?? {};
  return 'material' in props || 'material' in defaultProps;
}

registerLayerExtension({
  id: 'material',
  defaultOptions: {
    materialEnabled: false,
    materialAmbient: 0.64,
    materialDiffuse: 0.6,
    materialShininess: 32,
    materialSpecularColor: DEFAULT_SPECULAR_COLOR,
  },
  optionsSchema: [
    { key: 'materialEnabled', label: 'Override material', type: 'boolean', defaultValue: false, section: 'Material' },
    { key: 'materialAmbient', label: 'Ambient', type: 'number', defaultValue: 0.64, min: 0, max: 1, step: 0.01, section: 'Material' },
    { key: 'materialDiffuse', label: 'Diffuse', type: 'number', defaultValue: 0.6, min: 0, max: 1, step: 0.01, section: 'Material' },
    { key: 'materialShininess', label: 'Shininess', type: 'number', defaultValue: 32, section: 'Material' },
    { key: 'materialSpecularColor', label: 'Specular color', type: 'color', defaultValue: DEFAULT_SPECULAR_COLOR, section: 'Material' },
  ],
  apply(layer, config) {
    const options = config.options ?? {};
    if (!Boolean(options.materialEnabled)) {
      return layer;
    }

    if (!supportsMaterial(layer)) {
      return layer;
    }

    return layer.clone({
      material: {
        ambient: numericOption(options, 'materialAmbient', 0.64),
        diffuse: numericOption(options, 'materialDiffuse', 0.6),
        shininess: numericOption(options, 'materialShininess', 32),
        specularColor: rgbColor(options.materialSpecularColor),
      },
    } as any);
  },
});
