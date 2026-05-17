import { TextLayer } from '@deck.gl/layers';
import type { Feature } from 'geojson';
import type { BaseLayerConfig, LayerDefinition, LayerRenderContext } from '../types';

export interface TextLayerSettings {
  textField: string;
  fontSize: number;
  sizeMinPixels: number;
  sizeMaxPixels: number;
  sizeField: string;
  sizeScale: number;
  fontFamily: string;
  fontWeight: string;
  anchor: 'start' | 'middle' | 'end';
  baseline: 'top' | 'center' | 'bottom';
  billboard: boolean;
  background: boolean;
  pixelOffsetX: number;
  pixelOffsetY: number;
  autoDecimals: boolean;
}

export type TextLayerConfig = BaseLayerConfig<'text', TextLayerSettings>;
import { buildColorAccessor } from '../../utils/deckgl/colorScales';
import { createBaseLayerConfig, section } from '../defaults';
import { createCommonLayerProps, createSelectionColorAccessor, createSelectionState, getFeaturePosition } from '../utils';

const defaultSettings: TextLayerSettings = {
  textField: '',
  fontSize: 14,
  sizeMinPixels: 6,
  sizeMaxPixels: 64,
  sizeField: '',
  sizeScale: 1,
  fontFamily: 'Helvetica Neue, Verdana, Roboto, sans-serif',
  fontWeight: 'normal',
  anchor: 'middle',
  baseline: 'center',
  billboard: true,
  background: false,
  pixelOffsetX: 0,
  pixelOffsetY: 0,
  autoDecimals: false,
};

export const textLayerDefinition: LayerDefinition<TextLayerConfig> = {
  type: 'text',
  label: 'Text',
  createDefaultConfig(index) {
    return createBaseLayerConfig('text', 'Text', index, defaultSettings);
  },
  editorSections: [
    section('Text', [
      { key: 'textField', label: 'Text field', type: 'fieldPicker', defaultValue: '' },
      { key: 'fontSize', label: 'Font size (px)', type: 'number', defaultValue: 14 },
      { key: 'sizeMinPixels', label: 'Min size (px)', type: 'number', defaultValue: 6 },
      { key: 'sizeMaxPixels', label: 'Max size (px)', type: 'number', defaultValue: 64 },
      { key: 'sizeField', label: 'Size field', type: 'fieldPicker', defaultValue: '' },
      { key: 'sizeScale', label: 'Size scale', type: 'number', defaultValue: 1, step: 0.1 },
      { key: 'fontFamily', label: 'Font family', type: 'string', defaultValue: 'Helvetica Neue, Verdana, Roboto, sans-serif' },
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
      },
      { key: 'autoDecimals', label: 'Auto decimal formatting', type: 'boolean', defaultValue: false },
    ]),
    section('Style', [
      { key: 'billboard', label: 'Billboard (face camera)', type: 'boolean', defaultValue: true },
      { key: 'background', label: 'Background', type: 'boolean', defaultValue: false },
      { key: 'pixelOffsetX', label: 'Pixel offset X', type: 'number', defaultValue: 0 },
      { key: 'pixelOffsetY', label: 'Pixel offset Y', type: 'number', defaultValue: 0 },
    ]),
  ],
  renderLayers(context: LayerRenderContext<TextLayerConfig>) {
    const { config, selectedKey } = context;
    const options = config.settings;
    const baseColor = buildColorAccessor(config.colorScale, [255, 255, 255, 220]);
    const selectionState = createSelectionState(selectedKey, config.selectionKeyField);
    const getColor = createSelectionColorAccessor(baseColor, selectionState);
    const commonProps = createCommonLayerProps(context);
    const textField = options.textField;

    const getDecimals = (v: number) => (v > 6 ? 0 : 1);

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
          if (v == null) {
            return '';
          }
          if (typeof v === 'number') {
            if (options.autoDecimals) {
              return v.toFixed(getDecimals(v));
            }
            return Number.isInteger(v) ? String(v) : v.toFixed(2);
          }
          return String(v);
        },
        getSize: options.sizeField
          ? (f: Feature) => {
              const v = Number(f.properties?.[options.sizeField] ?? 0);
              if (options.autoDecimals) {
                const decs = getDecimals(v);
                const chars = String(v.toFixed(decs)).length;
                return Math.max(options.sizeMinPixels, Math.min(options.sizeMaxPixels, options.sizeMinPixels + v * options.sizeScale) / chars);
              }
              return Math.max(options.sizeMinPixels, Math.min(options.sizeMaxPixels, v * options.sizeScale));
            }
          : options.fontSize,
        getColor,
        getTextAnchor: options.anchor,
        getAlignmentBaseline: options.baseline,
        getPixelOffset: [options.pixelOffsetX, options.pixelOffsetY] as [number, number],
        polygonOffset: 1,
        updateTriggers: {
          ...commonProps.updateTriggers,
          getColor: [selectedKey],
          getText: [textField, options.autoDecimals],
          getSize: [options.sizeField, options.fontSize, options.sizeScale, options.autoDecimals],
        },
      }),
    ];
  },
};

export default textLayerDefinition;
