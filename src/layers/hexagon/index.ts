import { HexagonLayer } from '@deck.gl/aggregation-layers';
import type { Feature, Point } from 'geojson';
import { registerLayer } from '../registry';
import type { LayerOptionField, LayerRenderContext, LayerRenderer } from '../types';

const schema: LayerOptionField[] = [
  { key: 'radius', label: 'Radius (m)', type: 'number', defaultValue: 250, section: 'Hexagon' },
  { key: 'coverage', label: 'Coverage (0-1)', type: 'number', defaultValue: 0.9, section: 'Hexagon' },
  { key: 'extruded', label: 'Extruded', type: 'boolean', defaultValue: true, section: 'Elevation' },
  { key: 'elevationScale', label: 'Elevation scale', type: 'number', defaultValue: 50, section: 'Elevation' },
  { key: 'elevationWeightField', label: 'Elevation weight field', type: 'fieldPicker', defaultValue: '', section: 'Elevation' },
  {
    key: 'elevationAggregation',
    label: 'Elevation aggregation',
    type: 'select',
    defaultValue: 'SUM',
    selectOptions: [
      { label: 'Sum', value: 'SUM' },
      { label: 'Mean', value: 'MEAN' },
      { label: 'Min', value: 'MIN' },
      { label: 'Max', value: 'MAX' },
    ],
    section: 'Elevation',
  },
  { key: 'colorWeightField', label: 'Color weight field', type: 'fieldPicker', defaultValue: '', section: 'Color' },
  {
    key: 'colorAggregation',
    label: 'Color aggregation',
    type: 'select',
    defaultValue: 'SUM',
    selectOptions: [
      { label: 'Sum', value: 'SUM' },
      { label: 'Mean', value: 'MEAN' },
      { label: 'Min', value: 'MIN' },
      { label: 'Max', value: 'MAX' },
    ],
    section: 'Color',
  },
  {
    key: 'colorRange',
    label: 'Color preset',
    type: 'select',
    defaultValue: 'teal',
    selectOptions: [
      { label: 'Teal', value: 'teal' },
      { label: 'Blue to red', value: 'blueRed' },
      { label: 'Viridis-like', value: 'viridis' },
    ],
    section: 'Color',
  },
  { key: 'lowerPercentile', label: 'Lower percentile', type: 'number', defaultValue: 0, section: 'Filtering' },
  { key: 'upperPercentile', label: 'Upper percentile', type: 'number', defaultValue: 100, section: 'Filtering' },
];

const COLOR_RANGES: Record<string, Array<[number, number, number]>> = {
  teal: [
    [214, 245, 238],
    [153, 225, 210],
    [87, 197, 174],
    [24, 161, 135],
    [0, 124, 101],
    [0, 84, 70],
  ],
  blueRed: [
    [49, 130, 189],
    [107, 174, 214],
    [158, 202, 225],
    [254, 178, 76],
    [240, 59, 32],
    [189, 0, 38],
  ],
  viridis: [
    [68, 1, 84],
    [59, 82, 139],
    [33, 145, 140],
    [94, 201, 98],
    [253, 231, 37],
  ],
};

function getPointFeatures(features: Feature[], timeFilterFlags: Uint8Array) {
  return features.filter((feature: any) => feature.geometry?.type === 'Point' && timeFilterFlags[feature.__idx]);
}

function getWeight(feature: Feature, field: unknown) {
  if (!field) {
    return 1;
  }
  const value = Number(feature.properties?.[String(field)] ?? 0);
  return Number.isFinite(value) ? value : 0;
}

const renderer: LayerRenderer = {
  type: 'hexagon',
  label: 'Hexagon',
  defaultOptions: {
    radius: 250,
    coverage: 0.9,
    extruded: true,
    elevationScale: 50,
    elevationWeightField: '',
    elevationAggregation: 'SUM',
    colorWeightField: '',
    colorAggregation: 'SUM',
    colorRange: 'teal',
    lowerPercentile: 0,
    upperPercentile: 100,
  },
  optionsSchema: schema,

  renderLayers({ config, features, timeFilterFlags }: LayerRenderContext) {
    const opts = config.options as Record<string, unknown>;
    const data = getPointFeatures(features, timeFilterFlags);
    const colorRange = COLOR_RANGES[String(opts.colorRange ?? 'teal')] ?? COLOR_RANGES.teal;

    return [
      new HexagonLayer({
        id: `hexagon/${config.id}`,
        data,
        visible: config.visible,
        opacity: config.opacity,
        pickable: config.pickable ?? true,
        minZoom: config.minZoom,
        maxZoom: config.maxZoom,
        radius: Number(opts.radius ?? 250),
        coverage: Number(opts.coverage ?? 0.9),
        extruded: Boolean(opts.extruded ?? true),
        elevationScale: Number(opts.elevationScale ?? 50),
        elevationAggregation: opts.elevationAggregation ?? 'SUM',
        colorAggregation: opts.colorAggregation ?? 'SUM',
        colorRange,
        lowerPercentile: Number(opts.lowerPercentile ?? 0),
        upperPercentile: Number(opts.upperPercentile ?? 100),
        getPosition: (feature: Feature) => (feature.geometry as Point).coordinates as [number, number],
        getColorWeight: (feature: Feature) => getWeight(feature, opts.colorWeightField),
        getElevationWeight: (feature: Feature) => getWeight(feature, opts.elevationWeightField),
        parameters: { depthTest: config.elevation?.depthTest ?? false },
      } as any),
    ];
  },
};

registerLayer(renderer);
export default renderer;
