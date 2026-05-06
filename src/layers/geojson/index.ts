import { GeoJsonLayer } from '@deck.gl/layers';
import { DataFilterExtension } from '@deck.gl/extensions';
import { buildColorAccessor } from '../../utils/deckgl/colorScales';
import { registerLayer } from '../registry';
import type { LayerRenderContext, LayerRenderer, LayerOptionField } from '../types';

const schema: LayerOptionField[] = [
  { key: 'pointRadiusMinPixels', label: 'Point min radius (px)', type: 'number', defaultValue: 4 },
  { key: 'pointRadiusMaxPixels', label: 'Point max radius (px)', type: 'number', defaultValue: 20 },
  { key: 'lineWidthMinPixels', label: 'Line width (px)', type: 'number', defaultValue: 1 },
  { key: 'filled', label: 'Fill', type: 'boolean', defaultValue: true },
  { key: 'stroked', label: 'Stroke', type: 'boolean', defaultValue: true },
  { key: 'extruded', label: 'Extruded (3D)', type: 'boolean', defaultValue: false },
];

const renderer: LayerRenderer = {
  type: 'geojson',
  label: 'GeoJSON (universal)',
  defaultOptions: {
    pointRadiusMinPixels: 4,
    pointRadiusMaxPixels: 20,
    lineWidthMinPixels: 1,
    filled: true,
    stroked: true,
    extruded: false,
  },
  optionsSchema: schema,

  renderLayers({ config, features, timeFilterFlags, onFeatureClick }: LayerRenderContext) {
    const opts = config.options as Record<string, any>;
    const getColor = buildColorAccessor(config.colorScale);

    return [
      new GeoJsonLayer({
        id: config.id,
        data: { type: 'FeatureCollection', features },
        visible: config.visible,
        opacity: config.opacity,
        pickable: config.pickable ?? true,
        filled: opts.filled ?? true,
        stroked: opts.stroked ?? true,
        extruded: opts.extruded ?? false,
        pointRadiusUnits: 'pixels' as const,
        pointRadiusMinPixels: opts.pointRadiusMinPixels ?? 4,
        pointRadiusMaxPixels: opts.pointRadiusMaxPixels ?? 20,
        lineWidthUnits: 'pixels' as const,
        lineWidthMinPixels: opts.lineWidthMinPixels ?? 1,
        getFillColor: getColor as any,
        getLineColor: [200, 200, 240, 200],
        minZoom: config.minZoom,
        maxZoom: config.maxZoom,
        onClick: onFeatureClick
          ? (info: any) => info.object && onFeatureClick(info.object, info)
          : undefined,
        getFilterValue: (f: any) => (timeFilterFlags[f.__idx] ? 1 : -1),
        filterRange: [1, 1] as [number, number],
        extensions: [new DataFilterExtension({ filterSize: 1 })],
        updateTriggers: { getFilterValue: [timeFilterFlags] },
        parameters: { depthTest: false },
      }),
    ];
  },
};

registerLayer(renderer);
export default renderer;
