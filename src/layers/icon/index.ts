import { IconLayer } from '@deck.gl/layers';
import { DataFilterExtension } from '@deck.gl/extensions';
import type { Feature } from 'geojson';
import { buildColorAccessor } from '../../utils/deckgl/colorScales';
import { registerLayer } from '../registry';
import type { LayerRenderContext, LayerRenderer, LayerOptionField } from '../types';

const DEFAULT_ICON_ATLAS =
  'https://raw.githubusercontent.com/visgl/deck.gl-data/master/website/icon-atlas.png';
const DEFAULT_ICON_MAPPING =
  'https://raw.githubusercontent.com/visgl/deck.gl-data/master/website/icon-atlas.json';

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

    const iconAtlas = (opts.iconAtlasUrl as string)?.trim() || DEFAULT_ICON_ATLAS;
    const iconMapping = (opts.iconMappingUrl as string)?.trim() || DEFAULT_ICON_MAPPING;
    const fixedIcon: string = opts.fixedIcon ?? 'marker';

    return [
      new IconLayer({
        id: config.id,
        data: features,
        visible: config.visible,
        opacity: config.opacity,
        iconAtlas,
        iconMapping,
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
          ? (f: Feature) => String(f.properties?.[opts.iconField] ?? fixedIcon)
          : () => fixedIcon,
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
