import { GeoJsonLayer } from '@deck.gl/layers';
import { buildColorAccessor } from '../../utils/deckgl/colorScales';
import { registerLayer } from '../registry';
import type { LayerRenderContext, LayerRenderer, LayerOptionField } from '../types';
import { createCommonLayerProps } from '../utils';

interface GeoJsonLayerOptions {
  pointRadiusMinPixels: number;
  pointRadiusMaxPixels: number;
  lineWidthMinPixels: number;
  filled: boolean;
  stroked: boolean;
  extruded: boolean;
}

const schema: LayerOptionField[] = [
  { key: 'pointRadiusMinPixels', label: 'Point min radius (px)', type: 'number', defaultValue: 4 },
  { key: 'pointRadiusMaxPixels', label: 'Point max radius (px)', type: 'number', defaultValue: 20 },
  { key: 'lineWidthMinPixels', label: 'Line width (px)', type: 'number', defaultValue: 1 },
  { key: 'filled', label: 'Fill', type: 'boolean', defaultValue: true },
  { key: 'stroked', label: 'Stroke', type: 'boolean', defaultValue: true },
  { key: 'extruded', label: 'Extruded (3D)', type: 'boolean', defaultValue: false },
];

const renderer: LayerRenderer<GeoJsonLayerOptions> = {
  type: 'geojson',
  label: 'GeoJSON',
  defaultOptions: {
    pointRadiusMinPixels: 4,
    pointRadiusMaxPixels: 20,
    lineWidthMinPixels: 1,
    filled: true,
    stroked: true,
    extruded: false,
  },
  optionsSchema: schema,

  renderLayers(context: LayerRenderContext<GeoJsonLayerOptions>) {
    const { config, features, options } = context;
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

registerLayer(renderer);
export default renderer;
