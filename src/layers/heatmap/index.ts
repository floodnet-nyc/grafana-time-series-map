import { HeatmapLayer } from '@deck.gl/aggregation-layers';
import type { Feature, Point } from 'geojson';
import type { BaseLayerConfig, LayerDefinition, LayerRenderContext } from '../types';
import { createBaseLayerConfig, section } from '../defaults';
import { buildColorRange } from '../../utils/deckgl/colorScales';
import { createCommonLayerProps } from 'layers/utils';

export interface HeatmapLayerSettings {
  radiusPixels: number;
  intensity: number;
  threshold: number;
  weightField: string;
}

export type HeatmapLayerConfig = BaseLayerConfig<'heatmap', HeatmapLayerSettings>;

const defaultSettings: HeatmapLayerSettings = {
  radiusPixels: 30,
  intensity: 1,
  threshold: 0.03,
  weightField: '',
};

export const heatmapLayerDefinition: LayerDefinition<HeatmapLayerConfig> = {
  type: 'heatmap',
  label: 'Heatmap',
  createDefaultConfig(index) {
    return {
      ...createBaseLayerConfig('heatmap', 'Heatmap', index, defaultSettings),
      colorScale: {
        type: 'gradient',
        schemeName: 'HeatmapFire',
      },
    };
  },
  editorSections: [
    section('Heatmap', [
      { key: 'radiusPixels', label: 'Radius (px)', type: 'number', defaultValue: 30 },
      { key: 'intensity', label: 'Intensity', type: 'number', defaultValue: 1 },
      { key: 'threshold', label: 'Threshold (0-1)', type: 'number', defaultValue: 0.03 },
      { key: 'weightField', label: 'Weight field', type: 'fieldPicker', defaultValue: '' },
    ]),
  ],
  renderLayers(context: LayerRenderContext<HeatmapLayerConfig>) {
    const { config, features, getNumericAccessor } = context;
    const options = config.settings;
    
    const { onClick: _, ...commonProps } = createCommonLayerProps(context);
    const getWeight = getNumericAccessor(options.weightField, 1);
    const colorRange = buildColorRange(config.colorScale, 'HeatmapFire', 7) as Array<[number, number, number, number]>;

    return [
      new HeatmapLayer({
        ...commonProps,
        data: features,
        visible: config.visible,
        opacity: config.opacity,
        radiusPixels: options.radiusPixels,
        intensity: options.intensity,
        threshold: options.threshold,
        colorRange,
        getPosition: (f: Feature) => (f.geometry as Point).coordinates as [number, number],
        getWeight: getWeight ?? 1,
      }),
    ];
  },
};

export default heatmapLayerDefinition;
