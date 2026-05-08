import { TextLayer } from '@deck.gl/layers';
import { DataFilterExtension } from '@deck.gl/extensions';
import type { Feature } from 'geojson';
import { buildColorAccessor } from '../../utils/deckgl/colorScales';
import { registerLayer } from '../registry';
import type { LayerRenderContext, LayerRenderer, LayerOptionField } from '../types';

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

const renderer: LayerRenderer = {
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

  renderLayers({ config, features, timeFilterFlags, selectedKey, onFeatureClick }: LayerRenderContext) {
    const opts = config.options as Record<string, any>;
    const getColor = buildColorAccessor(config.colorScale, [255, 255, 255, 220]);

    const keyField = config.timeFilter?.groupByField ?? '';
    const isSelected = (f: Feature) =>
      selectedKey != null && keyField && String(f.properties?.[keyField]) === selectedKey;
    const hasSelection = selectedKey != null && keyField;

    const textField: string = opts.textField ?? '';

    return [
      new TextLayer({
        id: `text/${config.id}`,
        data: features,
        visible: config.visible,
        opacity: config.opacity,
        billboard: opts.billboard ?? true,
        background: opts.background ?? false,
        backgroundPadding: [4, 2, 4, 2],
        fontFamily: opts.fontFamily ?? 'Helvetica Neue, Verdana, Roboto, sans-serif',
        fontWeight: opts.fontWeight ?? 'normal',
        sizeScale: 1,
        sizeMinPixels: opts.sizeMinPixels ?? 6,
        sizeMaxPixels: opts.sizeMaxPixels ?? 64,
        pickable: config.pickable ?? true,
        minZoom: config.minZoom,
        maxZoom: config.maxZoom,
        getPosition: (f: Feature) => {
          const coords = (f.geometry as any)?.coordinates;
          if (!coords) { return [0, 0, 0]; }
          let z = 0;
          if (config.elevation?.field) {
            z = Number(f.properties?.[config.elevation.field] ?? 0) * (config.elevation.scale ?? 1);
          }
          return [coords[0], coords[1], z];
        },
        getText: (f: Feature) => {
          const v = f.properties?.[textField];
          if (v == null) { return ''; }
          if (typeof v === 'number') { return Number.isInteger(v) ? String(v) : v.toFixed(2); }
          return String(v);
        },
        getSize: opts.sizeField
          ? (f: Feature) => Number(f.properties?.[opts.sizeField] ?? opts.fontSize ?? 14)
          : (opts.fontSize ?? 14),
        getColor: hasSelection
          ? (f: Feature) => (isSelected(f) ? ([255, 230, 60, 255] as [number, number, number, number]) : getColor(f))
          : getColor,
        getTextAnchor: opts.anchor ?? 'middle',
        getAlignmentBaseline: opts.baseline ?? 'center',
        getPixelOffset: [opts.pixelOffsetX ?? 0, opts.pixelOffsetY ?? 0] as [number, number],
        onClick: onFeatureClick
          ? (info: any) => info.object && onFeatureClick(info.object, info)
          : undefined,
        getFilterValue: (f: any) => (timeFilterFlags[f.__idx] ? 1 : -1),
        filterRange: [1, 1] as [number, number],
        extensions: [new DataFilterExtension({ filterSize: 1 })],
        updateTriggers: {
          getFilterValue: [timeFilterFlags],
          getColor: [selectedKey],
          getText: [textField],
          getSize: [opts.sizeField, opts.fontSize],
        },
        parameters: { depthTest: false },
      }),
    ];
  },
};

registerLayer(renderer);
export default renderer;
