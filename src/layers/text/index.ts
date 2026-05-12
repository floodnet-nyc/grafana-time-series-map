import { TextLayer } from '@deck.gl/layers';
import type { Feature } from 'geojson';
import { buildColorAccessor } from '../../utils/deckgl/colorScales';
import { registerLayer } from '../registry';
import type { LayerRenderContext, LayerRenderer, LayerOptionField } from '../types';
import { createCommonLayerProps, createSelectionColorAccessor, createSelectionState, getFeaturePosition } from '../utils';

interface TextLayerOptions {
  textField: string;
  fontSize: number;
  sizeMinPixels: number;
  sizeMaxPixels: number;
  sizeField: string;
  fontFamily: string;
  fontWeight: string;
  anchor: 'start' | 'middle' | 'end';
  baseline: 'top' | 'center' | 'bottom';
  billboard: boolean;
  background: boolean;
  pixelOffsetX: number;
  pixelOffsetY: number;
}

const schema: LayerOptionField[] = [
  { key: 'textField', label: 'Text field', type: 'fieldPicker', defaultValue: '', section: 'Text' },
  { key: 'fontSize', label: 'Font size (px)', type: 'number', defaultValue: 14, section: 'Text' },
  { key: 'sizeMinPixels', label: 'Min size (px)', type: 'number', defaultValue: 6, section: 'Text' },
  { key: 'sizeMaxPixels', label: 'Max size (px)', type: 'number', defaultValue: 64, section: 'Text' },
  { key: 'sizeField', label: 'Size field', type: 'fieldPicker', defaultValue: '', section: 'Text' },
  {
    key: 'fontFamily',
    label: 'Font family',
    type: 'string',
    defaultValue: 'Helvetica Neue, Verdana, Roboto, sans-serif',
    section: 'Text',
  },
  {
    key: 'fontWeight',
    label: 'Font weight',
    type: 'select',
    defaultValue: 'normal',
    selectOptions: [
      { label: 'Normal', value: 'normal' },
      { label: 'Bold', value: 'bold' },
      { label: '300 (Light)', value: '300' },
      { label: '500 (Medium)', value: '500' },
      { label: '700 (Bold)', value: '700' },
      { label: '900 (Black)', value: '900' },
    ],
    section: 'Text',
  },
  {
    key: 'anchor',
    label: 'Horizontal anchor',
    type: 'select',
    defaultValue: 'middle',
    selectOptions: [
      { label: 'Start', value: 'start' },
      { label: 'Middle', value: 'middle' },
      { label: 'End', value: 'end' },
    ],
    section: 'Text',
  },
  {
    key: 'baseline',
    label: 'Vertical baseline',
    type: 'select',
    defaultValue: 'center',
    selectOptions: [
      { label: 'Top', value: 'top' },
      { label: 'Center', value: 'center' },
      { label: 'Bottom', value: 'bottom' },
    ],
    section: 'Text',
  },
  { key: 'billboard', label: 'Billboard (face camera)', type: 'boolean', defaultValue: true, section: 'Style' },
  { key: 'background', label: 'Background', type: 'boolean', defaultValue: false, section: 'Style' },
  { key: 'pixelOffsetX', label: 'Pixel offset X', type: 'number', defaultValue: 0, section: 'Style' },
  { key: 'pixelOffsetY', label: 'Pixel offset Y', type: 'number', defaultValue: 0, section: 'Style' },
];

const renderer: LayerRenderer<TextLayerOptions> = {
  type: 'text',
  label: 'Text',
  defaultOptions: {
    textField: '',
    fontSize: 14,
    sizeMinPixels: 6,
    sizeMaxPixels: 64,
    sizeField: '',
    fontFamily: 'Helvetica Neue, Verdana, Roboto, sans-serif',
    fontWeight: 'normal',
    anchor: 'middle',
    baseline: 'center',
    billboard: true,
    background: false,
    pixelOffsetX: 0,
    pixelOffsetY: 0,
  },
  optionsSchema: schema,

  renderLayers(context: LayerRenderContext<TextLayerOptions>) {
    const { config, selectedKey, options } = context;
    const baseColor = buildColorAccessor(config.colorScale, [255, 255, 255, 220]);
    const selectionState = createSelectionState(selectedKey, config.timeFilter?.groupByField);
    const getColor = createSelectionColorAccessor(baseColor, selectionState);
    const commonProps = createCommonLayerProps(context);

    const textField = options.textField;

    return [
      new TextLayer({
        ...commonProps,
        billboard: options.billboard,
        background: options.background,
        backgroundPadding: [4, 2, 4, 2],
        fontFamily: options.fontFamily,
        fontWeight: options.fontWeight,
        sizeScale: 1,
        sizeMinPixels: options.sizeMinPixels,
        sizeMaxPixels: options.sizeMaxPixels,
        getPosition: (f: Feature) => getFeaturePosition(f, config),
        getText: (f: Feature) => {
          const v = f.properties?.[textField];
          if (v == null) { return ''; }
          if (typeof v === 'number') { return Number.isInteger(v) ? String(v) : v.toFixed(2); }
          return String(v);
        },
        getSize: options.sizeField
          ? (f: Feature) => Number(f.properties?.[options.sizeField] ?? options.fontSize)
          : options.fontSize,
        getColor,
        getTextAnchor: options.anchor,
        getAlignmentBaseline: options.baseline,
        getPixelOffset: [options.pixelOffsetX, options.pixelOffsetY] as [number, number],
        updateTriggers: {
          ...commonProps.updateTriggers,
          getColor: [selectedKey],
          getText: [textField],
          getSize: [options.sizeField, options.fontSize],
        },
      }),
    ];
  },
};

registerLayer(renderer);
export default renderer;
