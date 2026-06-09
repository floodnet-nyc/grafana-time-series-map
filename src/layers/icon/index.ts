import { IconLayer } from '@deck.gl/layers';
import type { BaseLayerConfig, LayerDefinition, LayerRenderContext } from '../types';
import type { SourceRef } from '../../types';
import { AccessorContext } from '@deck.gl/core';
import { buildColorAccessor } from '../../utils/deckgl/colorScales';
import type { LayerDatum } from '../../utils/dataframe/layerTable';
import { createBaseLayerConfig, createSourceRef, section } from '../defaults';
import { DEFAULT_SELECTED_COLOR, createCommonLayerProps } from '../utils';
import { BUILT_IN_ICONS, DEFAULT_BUILT_IN_ICON, isBuiltInIconName, resolveBuiltInIcon } from './builtInIcons';

export interface IconLayerSettings {
  fixedIcon: string;
  icon: SourceRef;
  iconAtlasUrl: string;
  iconMappingUrl: string;
  fixedRotation: number;
  rotation: SourceRef;
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

const defaultSettings: IconLayerSettings = {
  fixedIcon: DEFAULT_BUILT_IN_ICON,
  icon: createSourceRef(),
  iconAtlasUrl: '',
  iconMappingUrl: '',
  fixedRotation: 0,
  rotation: createSourceRef(),
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
      { key: 'fixedIcon', label: 'Icon', type: 'select', defaultValue: DEFAULT_BUILT_IN_ICON, selectOptions: BUILT_IN_ICONS },
      {
        key: 'icon',
        label: 'Icon name field (supports tabler-filled:home)',
        type: 'fieldPicker',
        defaultValue: createSourceRef(),
      },
      { key: 'iconAtlasUrl', label: 'Custom atlas URL', type: 'string', defaultValue: '' },
      { key: 'iconMappingUrl', label: 'Custom mapping URL', type: 'string', defaultValue: '' },
      { key: 'fixedRotation', label: 'Rotation (deg)', type: 'number', defaultValue: 0 },
      { key: 'rotation', label: 'Rotation field', type: 'fieldPicker', defaultValue: createSourceRef() },
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
    const options: IconLayerSettings = { ...defaultSettings, ...config.settings };
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
    const [getPosition, updatesPosition] = getAccessors.pointPosition([0, 0, 0], getElevation);

    const [getIcon, updatesIcon] = getAccessor(options.icon, options.fixedIcon);
    const [getSize, updatesSize] = getAccessors.number(options.size, options.sizeScale);
    const [getAngle, updatesAngle] = getAccessors.number(options.rotation, options.fixedRotation);
    const iconAtlas = options.iconAtlasUrl.trim();
    const iconMapping = options.iconMappingUrl.trim();
    const useCustomAtlas = Boolean(iconAtlas && iconMapping);
    const fallbackIcon = resolveBuiltInIcon(DEFAULT_BUILT_IN_ICON);
    return [
      new IconLayer({
        ...commonProps,
        id: `icon/${config.id}`,
        data,
        ...(useCustomAtlas ? { iconAtlas, iconMapping } : {}),
        billboard: options.billboard,
        alphaCutoff: options.alphaCutoff,
        sizeScale: 1,
        sizeMinPixels: options.sizeMinPixels,
        sizeMaxPixels: options.sizeMaxPixels,
        getPosition,
        getIcon: (getIcon
          ? (datum: LayerDatum, ctx: AccessorContext<LayerDatum>) => {
              const iconName = String(getIcon(datum, ctx) ?? options.fixedIcon);
              if (useCustomAtlas) {
                return iconName;
              }
              return isBuiltInIconName(iconName) ? resolveBuiltInIcon(iconName) : fallbackIcon;
            }
          : () => (useCustomAtlas ? options.fixedIcon : resolveBuiltInIcon(options.fixedIcon))) as any,
        getSize: getSize ?? options.sizeScale,
        getAngle: getAngle ?? options.fixedRotation,
        getColor: getColor ?? [255, 255, 255, 255],
        updateTriggers: {
          ...commonProps.updateTriggers,
          getPosition: [...updatesPosition, ...updateElevation],
          getColor: updateSelection,
          getIcon: updatesIcon,
          getAngle: updatesAngle,
          getSize: updatesSize,
        },
      }),
    ];
  },
};

export default iconLayerDefinition;
