import { DEFAULT_DECK_PARAMETERS } from '../../utils/deckgl/parameters';
import type { LayerBlendingConfig, LayerExtensionDefinition } from '../types';
import { getLayerProps } from '../utils';

const blendOperations = [
  { label: 'Add', value: 'add' },
  { label: 'Subtract', value: 'subtract' },
  { label: 'Reverse subtract', value: 'reverse-subtract' },
  { label: 'Min', value: 'min' },
  { label: 'Max', value: 'max' },
];

const blendFactors = [
  { label: 'Zero', value: 'zero' },
  { label: 'One', value: 'one' },
  { label: 'Source', value: 'src' },
  { label: 'One minus source', value: 'one-minus-src' },
  { label: 'Source alpha', value: 'src-alpha' },
  { label: 'One minus source alpha', value: 'one-minus-src-alpha' },
  { label: 'Destination', value: 'dst' },
  { label: 'One minus destination', value: 'one-minus-dst' },
  { label: 'Destination alpha', value: 'dst-alpha' },
  { label: 'One minus destination alpha', value: 'one-minus-dst-alpha' },
  { label: 'Source alpha saturated', value: 'src-alpha-saturated' },
  { label: 'Constant', value: 'constant' },
  { label: 'One minus constant', value: 'one-minus-constant' },
];

export const blendingExtensionDefinition: LayerExtensionDefinition<LayerBlendingConfig> = {
  id: 'blending',
  label: 'Blending',
  createDefaults(): LayerBlendingConfig {
    return {
      enabled: false,
      blend: DEFAULT_DECK_PARAMETERS.blend,
      colorOperation: DEFAULT_DECK_PARAMETERS.blendColorOperation,
      colorSrcFactor: DEFAULT_DECK_PARAMETERS.blendColorSrcFactor,
      colorDstFactor: DEFAULT_DECK_PARAMETERS.blendColorDstFactor,
      alphaOperation: DEFAULT_DECK_PARAMETERS.blendAlphaOperation,
      alphaSrcFactor: DEFAULT_DECK_PARAMETERS.blendAlphaSrcFactor,
      alphaDstFactor: DEFAULT_DECK_PARAMETERS.blendAlphaDstFactor,
    };
  },
  editorSections: [
    {
      title: 'Blending',
      fields: [
        { key: 'enabled', label: 'Override blending', type: 'boolean', defaultValue: false },
        { key: 'blend', label: 'Blend', type: 'boolean', defaultValue: DEFAULT_DECK_PARAMETERS.blend },
        {
          key: 'colorOperation',
          label: 'Color blend operation',
          type: 'select',
          defaultValue: DEFAULT_DECK_PARAMETERS.blendColorOperation,
          selectOptions: blendOperations,
        },
        {
          key: 'colorSrcFactor',
          label: 'Color source factor',
          type: 'select',
          defaultValue: DEFAULT_DECK_PARAMETERS.blendColorSrcFactor,
          selectOptions: blendFactors,
        },
        {
          key: 'colorDstFactor',
          label: 'Color destination factor',
          type: 'select',
          defaultValue: DEFAULT_DECK_PARAMETERS.blendColorDstFactor,
          selectOptions: blendFactors,
        },
        {
          key: 'alphaOperation',
          label: 'Alpha blend operation',
          type: 'select',
          defaultValue: DEFAULT_DECK_PARAMETERS.blendAlphaOperation,
          selectOptions: blendOperations,
        },
        {
          key: 'alphaSrcFactor',
          label: 'Alpha source factor',
          type: 'select',
          defaultValue: DEFAULT_DECK_PARAMETERS.blendAlphaSrcFactor,
          selectOptions: blendFactors,
        },
        {
          key: 'alphaDstFactor',
          label: 'Alpha destination factor',
          type: 'select',
          defaultValue: DEFAULT_DECK_PARAMETERS.blendAlphaDstFactor,
          selectOptions: blendFactors,
        },
      ],
    },
  ],
  apply(layer, config) {
    if (!config.enabled) {
      return layer;
    }
    const props = getLayerProps(layer);

    return layer.clone({
      parameters: {
        ...(props.parameters ?? {}),
        blend: config.blend,
        blendColorOperation: config.colorOperation,
        blendColorSrcFactor: config.colorSrcFactor,
        blendColorDstFactor: config.colorDstFactor,
        blendAlphaOperation: config.alphaOperation,
        blendAlphaSrcFactor: config.alphaSrcFactor,
        blendAlphaDstFactor: config.alphaDstFactor,
      },
    } as any);
  },
};
