import { GeoJsonLayer } from '@deck.gl/layers';
import type { BaseLayerConfig, LayerDefinition, LayerRenderContext } from '../types';
import type { SourceRef } from '../../types';
import { buildColorAccessor } from '../../utils/deckgl/colorScales';
import { createBaseLayerConfig, createSourceRef, section } from '../defaults';
import { createCommonLayerProps } from '../utils';

export interface GeoJsonLayerSettings {
  pointRadiusMinPixels: number;
  pointRadiusMaxPixels: number;
  lineWidthMinPixels: number;
  lineWidth: SourceRef;
  lineWidthScale: number;
  lineWidthUnits: 'pixels' | 'meters';
  filled: boolean;
  stroked: boolean;
  extruded: boolean;
}

export type GeoJsonLayerConfig = BaseLayerConfig<'geojson', GeoJsonLayerSettings>;

const defaultSettings: GeoJsonLayerSettings = {
  pointRadiusMinPixels: 4,
  pointRadiusMaxPixels: 20,
  lineWidthMinPixels: 1,
  lineWidth: createSourceRef(),
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
      { key: 'lineWidth', label: 'Line width field', type: 'fieldPicker', defaultValue: createSourceRef() },
      // { key: 'lineWidthScale', label: 'Line width scale', type: 'number', defaultValue: 1 },
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
    const { config, featureCollection = [], getAccessor, getAccessors } = context;
    const options = config.settings;
    const commonProps = createCommonLayerProps(context);
    const [getColorValue, updatesColor] = config.colorScale?.field
      ? getAccessors.number(config.colorScale.field)
      : [undefined, []];
    const getFillColor = buildColorAccessor(config.colorScale, [0, 155, 104, 255], getColorValue as any);
    const getLineColor = buildColorAccessor(config.colorScale, [200, 200, 240, 200], getColorValue as any);
    const [getLineWidth, updatesLineWidth] = getAccessor(options.lineWidth, 0);
    return [
      new GeoJsonLayer({
        ...commonProps,
        id: `geojson/${config.id}`,
        data: { type: 'FeatureCollection', features: featureCollection },
        filled: options.filled,
        stroked: options.stroked,
        extruded: options.extruded,
        pointRadiusUnits: 'pixels' as const,
        pointRadiusMinPixels: options.pointRadiusMinPixels,
        pointRadiusMaxPixels: options.pointRadiusMaxPixels,
        lineWidthUnits: options.lineWidthUnits,
        lineWidthMinPixels: options.lineWidthMinPixels,
        getLineWidth: (getLineWidth ? (feature: any, ctx: any) => getLineWidth(feature, ctx) ?? 0 : 0) as any,
        getFillColor: getFillColor as any,
        getLineColor: getLineColor as any,
        updateTriggers: {
          ...commonProps.updateTriggers,
          getFillColor: updatesColor,
          getLineColor: updatesColor,
          getLineWidth: updatesLineWidth,
        },
      }),
    ];
  },
};

export default geoJsonLayerDefinition;
