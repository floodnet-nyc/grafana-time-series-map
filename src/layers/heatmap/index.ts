import { HeatmapLayer } from '@deck.gl/aggregation-layers';
import type { Feature, Point } from 'geojson';
import { registerLayer } from '../registry';
import type { LayerRenderContext, LayerRenderer, LayerOptionField } from '../types';

interface HeatmapLayerOptions {
  radiusPixels: number;
  intensity: number;
  threshold: number;
  weightField: string;
  colorRange: string;
}

const schema: LayerOptionField[] = [
  { key: 'radiusPixels', label: 'Radius (px)', type: 'number', defaultValue: 30 },
  { key: 'intensity', label: 'Intensity', type: 'number', defaultValue: 1 },
  { key: 'threshold', label: 'Threshold (0-1)', type: 'number', defaultValue: 0.03 },
  { key: 'weightField', label: 'Weight field', type: 'fieldPicker', defaultValue: '' },
  {
    key: 'colorRange',
    label: 'Color preset',
    type: 'select',
    defaultValue: 'fire',
    selectOptions: [
      { label: 'Fire (blue→red)', value: 'fire' },
      { label: 'Green→Yellow→Red', value: 'gyr' },
    ],
  },
];

const COLOR_RANGES: Record<string, Array<[number, number, number]>> = {
  fire: [
    [0, 0, 255],
    [0, 128, 255],
    [0, 255, 255],
    [0, 255, 128],
    [255, 255, 0],
    [255, 128, 0],
    [255, 0, 0],
  ],
  gyr: [
    [0, 200, 0],
    [100, 220, 0],
    [200, 240, 0],
    [255, 200, 0],
    [255, 100, 0],
    [220, 0, 0],
  ],
};

const renderer: LayerRenderer<HeatmapLayerOptions> = {
  type: 'heatmap',
  label: 'Heatmap',
  defaultOptions: {
    radiusPixels: 30,
    intensity: 1,
    threshold: 0.03,
    weightField: '',
    colorRange: 'fire',
  },
  optionsSchema: schema,

  renderLayers({ config, features, fromTimeMs, toTimeMs, options }: LayerRenderContext<HeatmapLayerOptions>) {
    const { mode, timeField } = config.timeFilter;
    const pointFeatures = features.filter((f) => f.geometry?.type === 'Point');

    // Heatmap doesn't support DataFilterExtension; subset by time window when mode=window
    const filtered =
      mode === 'window' && timeField
        ? pointFeatures.filter((f) => {
            const raw = f.properties?.[timeField];
            const t = raw instanceof Date ? raw.getTime() : Number(raw);
            return t >= fromTimeMs && t <= toTimeMs;
          })
        : pointFeatures;

    const colorRange = (COLOR_RANGES[options.colorRange] || COLOR_RANGES.fire).map((c) => [
      ...c,
      255,
    ]) as Array<[number, number, number, number]>;

    return [
      new HeatmapLayer({
        id: `heatmap/${config.id}`,
        data: filtered,
        visible: config.visible,
        opacity: config.opacity,
        radiusPixels: options.radiusPixels,
        intensity: options.intensity,
        threshold: options.threshold,
        colorRange,
        getPosition: (f: Feature) => (f.geometry as Point).coordinates as [number, number],
        getWeight: options.weightField
          ? (f: Feature) => Number(f.properties?.[options.weightField] ?? 1)
          : 1,
      }),
    ];
  },
};

registerLayer(renderer);
export default renderer;
