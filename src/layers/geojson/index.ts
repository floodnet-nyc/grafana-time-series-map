import { GeoJsonLayer } from '@deck.gl/layers';
import type { GeoJsonLayerConfig, GeoJsonLayerSettings } from '../../types';
import { buildColorAccessor } from '../../utils/deckgl/colorScales';
import { createBaseLayerConfig, section } from '../defaults';
import type { LayerDefinition, LayerRenderContext } from '../types';
import { createCommonLayerProps } from '../utils';

const defaultSettings: GeoJsonLayerSettings = {
  pointRadiusMinPixels: 4,
  pointRadiusMaxPixels: 20,
  lineWidthMinPixels: 1,
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
      { key: 'lineWidthMinPixels', label: 'Line width (px)', type: 'number', defaultValue: 1 },
      { key: 'filled', label: 'Fill', type: 'boolean', defaultValue: true },
      { key: 'stroked', label: 'Stroke', type: 'boolean', defaultValue: true },
      { key: 'extruded', label: 'Extruded (3D)', type: 'boolean', defaultValue: false },
    ]),
  ],
  renderLayers(context: LayerRenderContext<GeoJsonLayerConfig>) {
    const { config, features } = context;
    const options = config.settings;
    const getColor = buildColorAccessor(config.colorScale);
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
        lineWidthUnits: 'pixels' as const,
        lineWidthMinPixels: options.lineWidthMinPixels,
        getFillColor: getColor as any,
        getLineColor: [200, 200, 240, 200],
      }),
    ];
  },
};

export default geoJsonLayerDefinition;
