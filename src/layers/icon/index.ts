import { IconLayer } from '@deck.gl/layers';
import type { BaseLayerConfig, LayerDefinition, LayerRenderContext } from '../types';
import type { SourceRef } from '../../types';
import { AccessorContext } from '@deck.gl/core';
import { buildColorAccessor } from '../../utils/deckgl/colorScales';
import type { LayerDatum } from '../../utils/dataframe/layerTable';
import { createBaseLayerConfig, createSourceRef, section } from '../defaults';
import { DEFAULT_SELECTED_COLOR, createCommonLayerProps, getDatumPosition } from '../utils';

export interface IconLayerSettings {
  fixedIcon: string;
  icon: SourceRef;
  iconAtlasUrl: string;
  iconMappingUrl: string;
  elevation: SourceRef;
  elevationScale: number;
  depthTest: boolean;
  sizeScale: number;
  sizeMinPixels: number;
  sizeMaxPixels: number;
  size: SourceRef;
  billboard: boolean;
  alphaCutoff: number;
}

export type IconLayerConfig = BaseLayerConfig<'icon', IconLayerSettings>;

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
  icon: createSourceRef(),
  iconAtlasUrl: '',
  iconMappingUrl: '',
  elevation: createSourceRef(),
  elevationScale: 1,
  depthTest: false,
  sizeScale: 32,
  sizeMinPixels: 8,
  sizeMaxPixels: 64,
  size: createSourceRef(),
  billboard: true,
  alphaCutoff: 0.05,
};

export const iconLayerDefinition: LayerDefinition<IconLayerConfig, LayerDatum> = {
  type: 'icon',
  label: 'Icon',
  createDefaultConfig(index) {
    return createBaseLayerConfig('icon', 'Icon', index, defaultSettings);
  },
  editorSections: [
    section('Icon', [
      { key: 'fixedIcon', label: 'Icon', type: 'select', defaultValue: 'marker', selectOptions: BUILT_IN_ICONS },
      { key: 'icon', label: 'Icon name field (overrides above)', type: 'fieldPicker', defaultValue: createSourceRef() },
      { key: 'iconAtlasUrl', label: 'Custom atlas URL', type: 'string', defaultValue: '' },
      { key: 'iconMappingUrl', label: 'Custom mapping URL', type: 'string', defaultValue: '' },
      { key: 'elevation', label: 'Elevation field', type: 'fieldPicker', defaultValue: createSourceRef() },
      { key: 'elevationScale', label: 'Elevation scale', type: 'number', defaultValue: 1 },
      { key: 'depthTest', label: 'Depth test', type: 'boolean', defaultValue: false },
    ]),
    section('Size', [
      { key: 'sizeScale', label: 'Size (px)', type: 'number', defaultValue: 32 },
      { key: 'sizeMinPixels', label: 'Min size (px)', type: 'number', defaultValue: 8 },
      { key: 'sizeMaxPixels', label: 'Max size (px)', type: 'number', defaultValue: 64 },
      { key: 'size', label: 'Size field', type: 'fieldPicker', defaultValue: createSourceRef() },
    ]),
    section('Style', [
      { key: 'billboard', label: 'Billboard (face camera)', type: 'boolean', defaultValue: true },
      { key: 'alphaCutoff', label: 'Alpha cutoff', type: 'number', defaultValue: 0.05 },
    ]),
  ],
  renderLayers(context: LayerRenderContext<IconLayerConfig>) {
    const { config, data, getAccessor, getAccessors, selectedKey } = context;
    const options = config.settings;
    const commonProps = createCommonLayerProps(context);

    const [getColorValue] = config.colorScale?.field ? getAccessors.number(config.colorScale.field) : [undefined, []];
    const baseColor = buildColorAccessor<LayerDatum>(config.colorScale, [0, 155, 104, 255], getColorValue);
    const [getSelection, updateSelection] = getAccessor(config.selectionKey, undefined);
    const getColor =
      selectedKey != null && getSelection
        ? (datum: LayerDatum, ctx: AccessorContext<LayerDatum>) =>
            String(getSelection(datum, ctx) ?? '') === selectedKey
              ? (config.selectionColor ?? DEFAULT_SELECTED_COLOR)
              : baseColor(datum, ctx)
        : baseColor;

    const [getElevation, updateElevation] = getAccessors.number(options.elevation, options.elevationScale);

    const [getIcon, updatesIcon] = getAccessor(options.icon, options.fixedIcon);
    const [getSize, updatesSize] = getAccessors.number(options.size, options.sizeScale);
    const iconAtlas = options.iconAtlasUrl.trim();
    const iconMapping = options.iconMappingUrl.trim();
    const useCustomAtlas = Boolean(iconAtlas && iconMapping);
    return [
      new IconLayer({
        ...commonProps,
        id: `icon/${config.id}`,
        data,
        iconAtlas: useCustomAtlas ? iconAtlas : BUILT_IN_ICON_ATLAS,
        iconMapping: useCustomAtlas ? iconMapping : BUILT_IN_ICON_MAPPING,
        billboard: options.billboard,
        alphaCutoff: options.alphaCutoff,
        sizeScale: 1,
        sizeMinPixels: options.sizeMinPixels,
        sizeMaxPixels: options.sizeMaxPixels,
        getPosition: (datum: LayerDatum, ctx: AccessorContext<LayerDatum>) =>
          getDatumPosition(context.table, ctx.index, getElevation?.(datum, ctx)),
        getIcon: getIcon
          ? (datum: LayerDatum, ctx: AccessorContext<LayerDatum>) => {
              const iconName = getIcon(datum, ctx) as string;
              return useCustomAtlas ? iconName : getBuiltInIconName(iconName);
            }
          : () => (useCustomAtlas ? options.fixedIcon : getBuiltInIconName(options.fixedIcon)),
        getSize: getSize ?? options.sizeScale,
        getColor: getColor ?? [255, 255, 255, 255],
        updateTriggers: {
          ...commonProps.updateTriggers,
          getPosition: updateElevation,
          getColor: updateSelection,
          getIcon: updatesIcon,
          getSize: updatesSize,
        },
      }),
    ];
  },
};

export default iconLayerDefinition;
