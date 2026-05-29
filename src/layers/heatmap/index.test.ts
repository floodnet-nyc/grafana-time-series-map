import type { Feature, Point } from 'geojson';
import { featureArrayToLayerTable } from '../../utils/dataframe/layerTable';
import { createSourceRef } from '../defaults';
import type { GetAccessorFunction, GetAccessorFunctions, LayerRenderContext } from '../types';
import { heatmapLayerDefinition, type HeatmapLayerConfig } from './index';

jest.mock('@deck.gl/aggregation-layers', () => ({
  HeatmapLayer: class MockHeatmapLayer {
    props: Record<string, unknown>;
    constructor(props: Record<string, unknown>) {
      this.props = props;
    }
  },
}));

function createFeature(
  coordinates: [number, number],
  properties: Record<string, unknown> = {},
  index = 0
): Feature & { __idx: number } {
  return {
    type: 'Feature',
    geometry: {
      type: 'Point',
      coordinates,
    },
    properties,
    __idx: index,
  };
}

function createConfig(overrides: Partial<HeatmapLayerConfig> = {}): HeatmapLayerConfig {
  return {
    id: 'heatmap-1',
    type: 'heatmap',
    label: 'Heatmap',
    visible: true,
    data: { featureSource: { id: 'main', refId: '' } },
    geometry: {
      type: 'latlng',
      lat: createSourceRef('lat'),
      lng: createSourceRef('lng'),
    },
    timeFilter: { mode: 'none', time: createSourceRef() },
    opacity: 0.95,
    colorScale: {
      type: 'gradient',
      schemeName: 'Reds',
      invert: true,
    },
    settings: {
      radiusPixels: 30,
      intensity: 1,
      threshold: 0.03,
      weight: createSourceRef('weight'),
    },
    ...overrides,
  };
}

function createContext(
  config: HeatmapLayerConfig,
  features: Array<Feature & { __idx: number }>,
  timeFilterFlags = new Uint8Array(features.map(() => 1))
): LayerRenderContext<HeatmapLayerConfig> {
  const getAccessor: GetAccessorFunction = (fieldRef, defaultValue) => [
    fieldRef?.field ? (_datum: any, ctx: { index: number }) => features[ctx.index].properties?.[fieldRef.field] ?? defaultValue : undefined,
    [fieldRef?.source, fieldRef?.field, defaultValue],
  ];

  const getAccessors: GetAccessorFunctions = {
    number: (fieldRef, defaultValue = 0) => {
      const [accessor, deps] = getAccessor(fieldRef, defaultValue);
      return [
        accessor
          ? (feature, ctx) => {
              const value = accessor(feature, ctx);
              return typeof value === 'number' && Number.isFinite(value) ? value : defaultValue;
            }
          : undefined,
        deps,
      ];
    },
    array: getAccessor as any,
    numericArray: getAccessor as any,
    date: getAccessor as any,
    dateMs: getAccessor as any,
    geometry: () => [() => null, []],
    pointPosition: () => [
      (_feature: any, { index }: { index: number }) => (features[index].geometry as Point).coordinates,
      ['positions'],
    ],
    path: () => [() => [], []],
    polygon: () => [() => [], []],
  };

  return {
    config,
    panelOptions: {} as any,
    data: features.map((feature) => ({ __idx: feature.__idx })),
    table: featureArrayToLayerTable(features as any),
    features,
    cursorTimeMs: 0,
    fromTimeMs: 0,
    toTimeMs: 0,
    timeFilterFlags,
    getAccessor,
    getAccessors,
  };
}

describe('heatmapLayerDefinition', () => {
  it('wires point and weight accessors from layer data', () => {
    const feature = createFeature([-73.95, 40.78], { weight: 2 }, 0);

    const [layer] = heatmapLayerDefinition.renderLayers(createContext(createConfig(), [feature])) as any[];

    expect(layer.props.id).toBe('heatmap/heatmap-1');
    expect(layer.props.radiusPixels).toBe(30);
    expect(layer.props.intensity).toBe(1);
    expect(layer.props.threshold).toBe(0.03);
    expect(layer.props.data).toEqual([{ __idx: 0 }]);
    expect(layer.props.getWeight({ __idx: 0 }, { index: 0 })).toBe(2);
    expect(layer.props.getPosition({ __idx: 0 }, { index: 0 })).toEqual([-73.95, 40.78]);
  });
});
