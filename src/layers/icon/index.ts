import { IconLayer } from '@deck.gl/layers';
import { DataFilterExtension } from '@deck.gl/extensions';
import type { Feature } from 'geojson';
import { buildColorAccessor } from '../../utils/deckgl/colorScales';
import { registerLayer } from '../registry';
import type { LayerRenderContext, LayerRenderer, LayerOptionField } from '../types';

const BUILT_IN_ICONS = [
  { label: 'Marker', value: 'marker' },
  { label: 'Marker (shaded)', value: 'marker-shaded' },
  { label: 'Marker (outline)', value: 'marker-outline' },
  { label: 'Flag', value: 'flag' },
  { label: 'Circle', value: 'plain-circle' },
];

const schema: LayerOptionField[] = [
  {
    key: 'fixedIcon',
    label: 'Icon',
    type: 'select',
    defaultValue: 'marker',
    selectOptions: BUILT_IN_ICONS,
    section: 'Icon',
  },
  { key: 'iconField', label: 'Icon name field (overrides above)', type: 'fieldPicker', defaultValue: '', section: 'Icon' },
  { key: 'iconAtlasUrl', label: 'Custom atlas URL', type: 'string', defaultValue: '', section: 'Icon' },
  { key: 'iconMappingUrl', label: 'Custom mapping URL', type: 'string', defaultValue: '', section: 'Icon' },
  { key: 'sizeScale', label: 'Size (px)', type: 'number', defaultValue: 32, section: 'Size' },
  { key: 'sizeMinPixels', label: 'Min size (px)', type: 'number', defaultValue: 8, section: 'Size' },
  { key: 'sizeMaxPixels', label: 'Max size (px)', type: 'number', defaultValue: 64, section: 'Size' },
  { key: 'sizeField', label: 'Size field', type: 'fieldPicker', defaultValue: '', section: 'Size' },
  { key: 'billboard', label: 'Billboard (face camera)', type: 'boolean', defaultValue: true, section: 'Style' },
  { key: 'alphaCutoff', label: 'Alpha cutoff', type: 'number', defaultValue: 0.05, section: 'Style' },
];

function svgDataUrl(svg: string) {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

const BUILT_IN_ICON_ATLAS = svgDataUrl(`
  <svg xmlns="http://www.w3.org/2000/svg" width="320" height="64" viewBox="0 0 320 64">
    <path fill="white" d="M32 4C20.4 4 11 13.4 11 25c0 15.8 21 35 21 35s21-19.2 21-35C53 13.4 43.6 4 32 4zm0 30a9 9 0 1 1 0-18 9 9 0 0 1 0 18z"/>
    <g transform="translate(64 0)">
      <path fill="white" opacity=".35" d="M32 62s19-18.8 19-36C51 15.5 42.5 7 32 7v55z"/>
      <path fill="white" d="M32 4C20.4 4 11 13.4 11 25c0 15.8 21 35 21 35s21-19.2 21-35C53 13.4 43.6 4 32 4zm0 30a9 9 0 1 1 0-18 9 9 0 0 1 0 18z"/>
    </g>
    <g transform="translate(128 0)">
      <path fill="white" d="M32 4C20.4 4 11 13.4 11 25c0 15.8 21 35 21 35s21-19.2 21-35C53 13.4 43.6 4 32 4zm0 49.6C25.8 47.1 17 35.6 17 25c0-8.3 6.7-15 15-15s15 6.7 15 15c0 10.6-8.8 22.1-15 28.6z"/>
      <circle fill="white" cx="32" cy="25" r="7"/>
    </g>
    <g transform="translate(192 0)">
      <path fill="white" d="M14 58h6V8h-6v50zM24 9h31l-7 13 7 13H24V9z"/>
    </g>
    <g transform="translate(256 0)">
      <circle fill="white" cx="32" cy="32" r="28"/>
    </g>
  </svg>
`);

const BUILT_IN_ICON_MAPPING = {
  marker: { x: 0, y: 0, width: 64, height: 64, anchorY: 64, mask: true },
  'marker-shaded': { x: 64, y: 0, width: 64, height: 64, anchorY: 64, mask: true },
  'marker-outline': { x: 128, y: 0, width: 64, height: 64, anchorY: 64, mask: true },
  flag: { x: 192, y: 0, width: 64, height: 64, anchorX: 17, anchorY: 58, mask: true },
  'plain-circle': { x: 256, y: 0, width: 64, height: 64, mask: true },
};

function getBuiltInIconName(iconName: string) {
  return iconName in BUILT_IN_ICON_MAPPING ? iconName : 'marker';
}

const renderer: LayerRenderer = {
  type: 'icon',
  label: 'Icon',
  defaultOptions: {
    fixedIcon: 'marker',
    iconField: '',
    iconAtlasUrl: '',
    iconMappingUrl: '',
    sizeScale: 32,
    sizeMinPixels: 8,
    sizeMaxPixels: 64,
    sizeField: '',
    billboard: true,
    alphaCutoff: 0.05,
  },
  optionsSchema: schema,

  renderLayers({ config, features, timeFilterFlags, selectedKey, onFeatureClick }: LayerRenderContext) {
    const opts = config.options as Record<string, any>;
    const getColor = buildColorAccessor(config.colorScale);

    const keyField = config.timeFilter?.groupByField ?? '';
    const isSelected = (f: Feature) =>
      selectedKey != null && keyField && String(f.properties?.[keyField]) === selectedKey;
    const hasSelection = selectedKey != null && keyField;

    const iconAtlas = (opts.iconAtlasUrl as string)?.trim();
    const iconMapping = (opts.iconMappingUrl as string)?.trim();
    const useCustomAtlas = Boolean(iconAtlas && iconMapping);
    const fixedIcon: string = opts.fixedIcon ?? 'marker';

    return [
      new IconLayer({
        id: `icon/${config.id}`,
        data: features,
        visible: config.visible,
        opacity: config.opacity,
        iconAtlas: useCustomAtlas ? iconAtlas : BUILT_IN_ICON_ATLAS,
        iconMapping: useCustomAtlas ? iconMapping : BUILT_IN_ICON_MAPPING,
        billboard: opts.billboard ?? true,
        alphaCutoff: opts.alphaCutoff ?? 0.05,
        sizeScale: 1,
        sizeMinPixels: opts.sizeMinPixels ?? 8,
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
        getIcon: opts.iconField
          ? (f: Feature) => {
              const iconName = String(f.properties?.[opts.iconField] ?? fixedIcon);
              return useCustomAtlas ? iconName : getBuiltInIconName(iconName);
            }
          : () => (useCustomAtlas ? fixedIcon : getBuiltInIconName(fixedIcon)),
        getSize: opts.sizeField
          ? (f: Feature) => Number(f.properties?.[opts.sizeField] ?? opts.sizeScale ?? 32)
          : (opts.sizeScale ?? 32),
        getColor: hasSelection
          ? (f: Feature) => (isSelected(f) ? ([255, 230, 60, 255] as [number, number, number, number]) : getColor(f))
          : getColor,
        onClick: onFeatureClick
          ? (info: any) => info.object && onFeatureClick(info.object, info)
          : undefined,
        getFilterValue: (f: any) => (timeFilterFlags[f.__idx] ? 1 : -1),
        filterRange: [1, 1] as [number, number],
        extensions: [new DataFilterExtension({ filterSize: 1 })],
        updateTriggers: {
          getFilterValue: [timeFilterFlags],
          getColor: [selectedKey],
          getIcon: [opts.iconField, opts.fixedIcon],
          getSize: [opts.sizeField, opts.sizeScale],
        },
        parameters: { depthTest: false },
      }),
    ];
  },
};

registerLayer(renderer);
export default renderer;
