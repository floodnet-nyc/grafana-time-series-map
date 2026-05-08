import { DEFAULT_DECK_PARAMETERS } from '../../../utils/deckgl/parameters';
import { registerLayerExtension } from '../registry';

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

registerLayerExtension({
  id: 'blending',
  defaultOptions: {
    layerBlendEnabled: false,
    layerBlend: DEFAULT_DECK_PARAMETERS.blend,
    layerBlendColorOperation: DEFAULT_DECK_PARAMETERS.blendColorOperation,
    layerBlendColorSrcFactor: DEFAULT_DECK_PARAMETERS.blendColorSrcFactor,
    layerBlendColorDstFactor: DEFAULT_DECK_PARAMETERS.blendColorDstFactor,
    layerBlendAlphaOperation: DEFAULT_DECK_PARAMETERS.blendAlphaOperation,
    layerBlendAlphaSrcFactor: DEFAULT_DECK_PARAMETERS.blendAlphaSrcFactor,
    layerBlendAlphaDstFactor: DEFAULT_DECK_PARAMETERS.blendAlphaDstFactor,
  },
  optionsSchema: [
    { key: 'layerBlendEnabled', label: 'Override blending', type: 'boolean', defaultValue: false, section: 'Blending' },
    { key: 'layerBlend', label: 'Blend', type: 'boolean', defaultValue: DEFAULT_DECK_PARAMETERS.blend, section: 'Blending' },
    {
      key: 'layerBlendColorOperation',
      label: 'Color blend operation',
      type: 'select',
      defaultValue: DEFAULT_DECK_PARAMETERS.blendColorOperation,
      selectOptions: blendOperations,
      section: 'Blending',
    },
    {
      key: 'layerBlendColorSrcFactor',
      label: 'Color source factor',
      type: 'select',
      defaultValue: DEFAULT_DECK_PARAMETERS.blendColorSrcFactor,
      selectOptions: blendFactors,
      section: 'Blending',
    },
    {
      key: 'layerBlendColorDstFactor',
      label: 'Color destination factor',
      type: 'select',
      defaultValue: DEFAULT_DECK_PARAMETERS.blendColorDstFactor,
      selectOptions: blendFactors,
      section: 'Blending',
    },
    {
      key: 'layerBlendAlphaOperation',
      label: 'Alpha blend operation',
      type: 'select',
      defaultValue: DEFAULT_DECK_PARAMETERS.blendAlphaOperation,
      selectOptions: blendOperations,
      section: 'Blending',
    },
    {
      key: 'layerBlendAlphaSrcFactor',
      label: 'Alpha source factor',
      type: 'select',
      defaultValue: DEFAULT_DECK_PARAMETERS.blendAlphaSrcFactor,
      selectOptions: blendFactors,
      section: 'Blending',
    },
    {
      key: 'layerBlendAlphaDstFactor',
      label: 'Alpha destination factor',
      type: 'select',
      defaultValue: DEFAULT_DECK_PARAMETERS.blendAlphaDstFactor,
      selectOptions: blendFactors,
      section: 'Blending',
    },
  ],
  apply(layer, config) {
    const options = config.options ?? {};
    if (!Boolean(options.layerBlendEnabled)) {
      return layer;
    }
    const props = (layer as any).props ?? {};

    return layer.clone({
      parameters: {
        ...(props.parameters ?? {}),
        blend: Boolean(options.layerBlend ?? DEFAULT_DECK_PARAMETERS.blend),
        blendColorOperation: options.layerBlendColorOperation ?? DEFAULT_DECK_PARAMETERS.blendColorOperation,
        blendColorSrcFactor: options.layerBlendColorSrcFactor ?? DEFAULT_DECK_PARAMETERS.blendColorSrcFactor,
        blendColorDstFactor: options.layerBlendColorDstFactor ?? DEFAULT_DECK_PARAMETERS.blendColorDstFactor,
        blendAlphaOperation: options.layerBlendAlphaOperation ?? DEFAULT_DECK_PARAMETERS.blendAlphaOperation,
        blendAlphaSrcFactor: options.layerBlendAlphaSrcFactor ?? DEFAULT_DECK_PARAMETERS.blendAlphaSrcFactor,
        blendAlphaDstFactor: options.layerBlendAlphaDstFactor ?? DEFAULT_DECK_PARAMETERS.blendAlphaDstFactor,
      },
    } as any);
  },
});
