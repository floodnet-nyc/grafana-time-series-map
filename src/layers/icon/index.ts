import { IconLayer } from '@deck.gl/layers';
import type { Feature } from 'geojson';
import type { BaseLayerConfig, LayerDefinition, LayerRenderContext } from '../types';

export interface IconLayerSettings {
  fixedIcon: string;
  iconField: string;
  iconAtlasUrl: string;
  iconMappingUrl: string;
  sizeScale: number;
  sizeMinPixels: number;
  sizeMaxPixels: number;
  sizeField: string;
  billboard: boolean;
  alphaCutoff: number;
}

export type IconLayerConfig = BaseLayerConfig<'icon', IconLayerSettings>;
import { buildColorAccessor } from '../../utils/deckgl/colorScales';
import { createBaseLayerConfig, section } from '../defaults';
import { createCommonLayerProps, createSelectionColorAccessor, createSelectionState, getFeaturePosition } from '../utils';

const BUILT_IN_ICONS = [
  { label: 'Marker', value: 'marker' },
  { label: 'Marker (shaded)', value: 'marker-shaded' },
  { label: 'Marker (outline)', value: 'marker-outline' },
  { label: 'Flag', value: 'flag' },
  { label: 'Circle', value: 'plain-circle' },
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

const defaultSettings: IconLayerSettings = {
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
};

export const iconLayerDefinition: LayerDefinition<IconLayerConfig> = {
  type: 'icon',
  label: 'Icon',
  createDefaultConfig(index) {
    return createBaseLayerConfig('icon', 'Icon', index, defaultSettings);
  },
  editorSections: [
    section('Icon', [
      { key: 'fixedIcon', label: 'Icon', type: 'select', defaultValue: 'marker', selectOptions: BUILT_IN_ICONS },
      { key: 'iconField', label: 'Icon name field (overrides above)', type: 'fieldPicker', defaultValue: '' },
      { key: 'iconAtlasUrl', label: 'Custom atlas URL', type: 'string', defaultValue: '' },
      { key: 'iconMappingUrl', label: 'Custom mapping URL', type: 'string', defaultValue: '' },
    ]),
    section('Size', [
      { key: 'sizeScale', label: 'Size (px)', type: 'number', defaultValue: 32 },
      { key: 'sizeMinPixels', label: 'Min size (px)', type: 'number', defaultValue: 8 },
      { key: 'sizeMaxPixels', label: 'Max size (px)', type: 'number', defaultValue: 64 },
      { key: 'sizeField', label: 'Size field', type: 'fieldPicker', defaultValue: '' },
    ]),
    section('Style', [
      { key: 'billboard', label: 'Billboard (face camera)', type: 'boolean', defaultValue: true },
      { key: 'alphaCutoff', label: 'Alpha cutoff', type: 'number', defaultValue: 0.05 },
    ]),
  ],
  renderLayers(context: LayerRenderContext<IconLayerConfig>) {
    const { config, features, selectedKey } = context;
    const options = config.settings;
    const baseColor = buildColorAccessor(config.colorScale);
    const selectionState = createSelectionState(selectedKey, config.selectionKeyField);
    const getColor = createSelectionColorAccessor(baseColor, selectionState);
    const commonProps = createCommonLayerProps(context);
    const iconAtlas = options.iconAtlasUrl.trim();
    const iconMapping = options.iconMappingUrl.trim();
    const useCustomAtlas = Boolean(iconAtlas && iconMapping);
    const fixedIcon = options.fixedIcon;
    return [
      new IconLayer({
        ...commonProps,
        id: `icon/${config.id}`,
        data: features,
        iconAtlas: useCustomAtlas ? iconAtlas : BUILT_IN_ICON_ATLAS,
        iconMapping: useCustomAtlas ? iconMapping : BUILT_IN_ICON_MAPPING,
        billboard: options.billboard,
        alphaCutoff: options.alphaCutoff,
        sizeScale: 1,
        sizeMinPixels: options.sizeMinPixels,
        sizeMaxPixels: options.sizeMaxPixels,
        getPosition: (f: Feature) => getFeaturePosition(f, config),
        getIcon: options.iconField
          ? (f: Feature) => {
              const iconName = String(f.properties?.[options.iconField] ?? fixedIcon);
              return useCustomAtlas ? iconName : getBuiltInIconName(iconName);
            }
          : () => (useCustomAtlas ? fixedIcon : getBuiltInIconName(fixedIcon)),
        getSize: options.sizeField ? (f: Feature) => Number(f.properties?.[options.sizeField] ?? options.sizeScale) : options.sizeScale,
        getColor,
        updateTriggers: {
          ...commonProps.updateTriggers,
          getColor: [selectedKey],
          getIcon: [options.iconField, options.fixedIcon],
          getSize: [options.sizeField, options.sizeScale],
        },
      }),
    ];
  },
};

export default iconLayerDefinition;
