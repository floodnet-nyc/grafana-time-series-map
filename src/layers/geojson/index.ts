import { GeoJsonLayer } from '@deck.gl/layers';
import type { GeoJsonLayerConfig, GeoJsonLayerSettings, LayerDefinition, LayerRenderContext } from '../types';
import { buildColorAccessor } from '../../utils/deckgl/colorScales';
import { createBaseLayerConfig, section } from '../defaults';
import { createCommonLayerProps, getNumericProperty } from '../utils';

const defaultSettings: GeoJsonLayerSettings = {
  pointRadiusMinPixels: 4,
  pointRadiusMaxPixels: 20,
  lineWidthMinPixels: 1,
  lineWidthField: '',
  lineWidthScale: 1,
  lineWidthUnits: 'pixels',
  filled: true,
  stroked: true,
  extruded: false,
};

export const geoJsonLayerDefinition: LayerDefinition<GeoJsonLayerConfig> = {
  type: 'geojson',
  label: 'GeoJSON',
  createDefaultConfig(index) {
    return createBaseLayerConfig('geojson', 'GeoJSON', index, defaultSettings);
  },
  editorSections: [
    section('GeoJSON', [
      { key: 'pointRadiusMinPixels', label: 'Point min radius (px)', type: 'number', defaultValue: 4 },
      { key: 'pointRadiusMaxPixels', label: 'Point max radius (px)', type: 'number', defaultValue: 20 },
      { key: 'lineWidthMinPixels', label: 'Line min width (px)', type: 'number', defaultValue: 1 },
      { key: 'lineWidthField', label: 'Line width field', type: 'fieldPicker', defaultValue: '' },
      { key: 'lineWidthScale', label: 'Line width scale', type: 'number', defaultValue: 1 },
      {
        key: 'lineWidthUnits',
        label: 'Line width units',
        type: 'select',
        defaultValue: 'pixels',
        selectOptions: [
          { label: 'Pixels', value: 'pixels' },
          { label: 'Meters', value: 'meters' },
        ],
      },
      { key: 'filled', label: 'Fill', type: 'boolean', defaultValue: true },
      { key: 'stroked', label: 'Stroke', type: 'boolean', defaultValue: true },
      { key: 'extruded', label: 'Extruded (3D)', type: 'boolean', defaultValue: false },
    ]),
  ],
  renderLayers(context: LayerRenderContext<GeoJsonLayerConfig>) {
    const { config, features } = context;
    const options = config.settings;
    const getFillColor = buildColorAccessor(config.colorScale);
    const getLineColor = buildColorAccessor(config.colorScale, [200, 200, 240, 200]);
    const getLineWidth = (feature: any) =>
      options.lineWidthField ? getNumericProperty(feature, options.lineWidthField) * options.lineWidthScale : options.lineWidthScale;
    const commonProps = createCommonLayerProps(context);
    return [
      new GeoJsonLayer({
        ...commonProps,
        id: `geojson/${config.id}`,
        data: { type: 'FeatureCollection', features },
        filled: options.filled,
        stroked: options.stroked,
        extruded: options.extruded,
        pointRadiusUnits: 'pixels' as const,
        pointRadiusMinPixels: options.pointRadiusMinPixels,
        pointRadiusMaxPixels: options.pointRadiusMaxPixels,
        lineWidthUnits: options.lineWidthUnits,
        lineWidthMinPixels: options.lineWidthMinPixels,
        getLineWidth,
        getFillColor: getFillColor as any,
        getLineColor: getLineColor as any,
        updateTriggers: {
          ...commonProps.updateTriggers,
          getLineWidth: [options.lineWidthField, options.lineWidthScale],
        },
      }),
    ];
  },
};

export default geoJsonLayerDefinition;
