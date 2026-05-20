import { TextLayer } from '@deck.gl/layers';
import type { Feature } from 'geojson';
import type { BaseLayerConfig, LayerDefinition, LayerRenderContext } from '../types';
import type { SourceRef } from '../../types';

export interface TextLayerSettings {
  text: SourceRef;
  fontSize: number;
  sizeMinPixels: number;
  sizeMaxPixels: number;
  size: SourceRef;
  sizeScale: number;
  elevation: SourceRef;
  elevationScale: number;
  depthTest: boolean;
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
import { createBaseLayerConfig, createSourceRef, section } from '../defaults';
import { createCommonLayerProps, getFeaturePosition } from '../utils';
import { AccessorContext } from '@deck.gl/core';

const defaultSettings: TextLayerSettings = {
  text: createSourceRef(),
  fontSize: 14,
  sizeMinPixels: 6,
  sizeMaxPixels: 64,
  size: createSourceRef(),
  sizeScale: 1,
  elevation: createSourceRef(),
  elevationScale: 1,
  depthTest: false,
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
      { key: 'text', label: 'Text field', type: 'fieldPicker', defaultValue: createSourceRef() },
      { key: 'fontSize', label: 'Font size (px)', type: 'number', defaultValue: 14 },
      { key: 'sizeMinPixels', label: 'Min size (px)', type: 'number', defaultValue: 6 },
      { key: 'sizeMaxPixels', label: 'Max size (px)', type: 'number', defaultValue: 64 },
      { key: 'size', label: 'Size field', type: 'fieldPicker', defaultValue: createSourceRef() },
      { key: 'sizeScale', label: 'Size scale', type: 'number', defaultValue: 1, step: 0.1 },
      { key: 'elevation', label: 'Elevation field', type: 'fieldPicker', defaultValue: createSourceRef() },
      { key: 'elevationScale', label: 'Elevation scale', type: 'number', defaultValue: 1 },
      { key: 'depthTest', label: 'Depth test', type: 'boolean', defaultValue: false },
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
    const { config, getAccessor, getAccessors, selectedKey } = context;
    const options = config.settings;
    const commonProps = createCommonLayerProps(context);

    const [getColorValue] = config.colorScale?.field ? getAccessors.number(config.colorScale.field) : [undefined, []];
    const baseColor = buildColorAccessor(config.colorScale, [255, 255, 255, 220], getColorValue);
    const[getSelection, updateSelection] = getAccessor(config.selectionKey, undefined);
    const getColor = (
      selectedKey != null && getSelection ? 
        (feature: Feature, ctx: AccessorContext<Feature>) => (getSelection(feature, ctx) && config.selectionColor ? config.selectionColor : baseColor(feature, ctx))
        : baseColor
    );

    const [getText, updatesText] = getAccessor(options.text, '');
    const [getSize, updatesSize] = getAccessors.number(options.size, options.fontSize);
    const [getElevation, updateElevation] = getAccessors.number(options.elevation, options.elevationScale);

    // const getDecimals = (v: number) => (v > 6 ? 0 : 1);

    return [
      new TextLayer({
        ...commonProps,
        data: context.features,
        billboard: options.billboard,
        background: options.background,
        backgroundPadding: [4, 2, 4, 2],
        fontFamily: options.fontFamily,
        fontWeight: options.fontWeight,
        sizeScale: 1,
        sizeMinPixels: options.sizeMinPixels,
        sizeMaxPixels: options.sizeMaxPixels,
        getPosition: (f: Feature, ctx: AccessorContext<Feature>) => getFeaturePosition(f, getElevation?.(f, ctx)),
        getText: getText ? (f: Feature, ctx: AccessorContext<Feature>) => autoDecimalsText(getText(f, ctx), options.autoDecimals) : undefined,
        getSize: getSize ? (f: Feature, ctx: AccessorContext<Feature>) => autoDecimalsSize(getSize(f, ctx), options.autoDecimals) : options.fontSize,
        getColor,
        getTextAnchor: options.anchor,
        getAlignmentBaseline: options.baseline,
        getPixelOffset: [options.pixelOffsetX, options.pixelOffsetY] as [number, number],
        polygonOffset: 1,
        updateTriggers: {
          ...commonProps.updateTriggers,
          getPosition: updateElevation,
          getColor: updateSelection,
          getText: updatesText,
          getSize: updatesSize,
        },
      }),
    ];
  },
};

export const autoDecimalsSize = (v: string | number | null | undefined, auto: boolean) => {
  if (v == null) {
    return 0;
  }
  if (typeof v === 'number') {
    if (auto) {
      const decs = v > 6 ? 0 : 1;
      const chars = String(v.toFixed(decs)).length;
      return Math.max(defaultSettings.sizeMinPixels, Math.min(defaultSettings.sizeMaxPixels, defaultSettings.sizeMinPixels + v * defaultSettings.sizeScale) / chars);
    }
    return Math.max(defaultSettings.sizeMinPixels, Math.min(defaultSettings.sizeMaxPixels, v * defaultSettings.sizeScale));
  }
  return defaultSettings.fontSize;
};

export const autoDecimalsText = (v: string | number | null | undefined, auto: boolean) => {
  if (v == null) {
    return '';
  }
  if (typeof v === 'number') {
    if (auto) {
      return v.toFixed(v > 6 ? 0 : 1);
    }
    return Number.isInteger(v) ? String(v) : v.toFixed(2);
  }
  return String(v);
};

export default textLayerDefinition;
