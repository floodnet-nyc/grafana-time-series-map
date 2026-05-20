import type { Feature } from 'geojson';
import { createSourceRef } from '../defaults';
import type { GetAccessorFunction, GetAccessorFunctions, LayerRenderContext } from '../types';
import type { TripsLayerConfig } from './index';

jest.mock('@deck.gl/geo-layers', () => ({
  TripsLayer: class MockTripsLayer {
    props: Record<string, unknown>;
    constructor(props: Record<string, unknown>) {
      this.props = props;
    }
  },
}));

jest.mock('@deck.gl/extensions', () => ({
  DataFilterExtension: class MockDataFilterExtension {
    props: Record<string, unknown>;
    constructor(props: Record<string, unknown>) {
      this.props = props;
    }
  },
}));

import { tripsLayerDefinition } from './index';

function createFeature(
  coordinates: number[][],
  properties: Record<string, unknown> = {},
  index = 0,
): Feature & { __idx: number } {
  return {
    type: 'Feature',
    geometry: {
      type: 'LineString',
      coordinates,
    },
    properties,
    __idx: index,
  };
}

function createConfig(overrides: Partial<TripsLayerConfig> = {}): TripsLayerConfig {
  return {
    id: 'trips-1',
    type: 'trips',
    label: 'Trips',
    visible: true,
    data: { featureSource: { id: 'main', refId: '' } },
    geometry: { type: 'none' },
    timeFilter: { mode: 'none', time: createSourceRef() },
    opacity: 1,
    settings: {
      timestamps: createSourceRef(),
      timestampUnit: 'ms',
      trailLengthMs: 300000,
      fadeTrail: true,
      widthMinPixels: 2,
      widthMaxPixels: 8,
      width: createSourceRef('width_value'),
      widthScale: 1,
      capRounded: true,
      jointRounded: true,
    },
    ...overrides,
  };
}

function createContext(config: TripsLayerConfig, features: Array<Feature & { __idx: number }>): LayerRenderContext<TripsLayerConfig> {
  const getAccessor: GetAccessorFunction = (fieldRef, defaultValue) => [
    fieldRef?.field ? (feature) => feature.properties?.[fieldRef.field] ?? defaultValue : undefined,
    [fieldRef?.source, fieldRef?.field, defaultValue],
  ];

  function numericArrayFallback(raw: unknown, defaultValue: number[]): number[] {
    if (Array.isArray(raw)) {
      return raw.map(Number).filter(Number.isFinite);
    }
    if (typeof raw === 'string') {
      const trimmed = raw.trim();
      if (!trimmed) {
        return [];
      }
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          return parsed.map(Number).filter(Number.isFinite);
        }
      } catch { /* not JSON */ }
      return trimmed.split(',').map((v) => Number(v.trim())).filter(Number.isFinite);
    }
    return defaultValue;
  }

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
    date: getAccessor as any,
    dateMs: (fieldRef, defaultValue = 0) => {
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
    numericArray: (fieldRef, defaultValue: number[] = []) => {
      const [accessor, deps] = getAccessor(fieldRef, defaultValue);
      return [
        accessor
          ? (feature, ctx) => {
              const value = accessor(feature, ctx);
              return numericArrayFallback(value, defaultValue);
            }
          : undefined,
        deps,
      ];
    },
  };

  return {
    config,
    panelOptions: {} as any,
    features,
    cursorTimeMs: 123456,
    fromTimeMs: 100000,
    toTimeMs: 200000,
    timeFilterFlags: new Uint8Array(features.map(() => 1)),
    getAccessor,
    getAccessors,
  };
}

describe('tripsLayerDefinition', () => {
  it('renders from the original feature array and preserves feature identity', () => {
    const feature = createFeature(
      [
        [-73.9, 40.7, 1000],
        [-73.8, 40.8, 2000],
      ],
      { width_value: 7 },
      0,
    );
    const clicked: Feature[] = [];
    const config = createConfig();
    const context = createContext(config, [feature]);

    const [layer] = tripsLayerDefinition.renderLayers({
      ...context,
      onFeatureClick: (clickedFeature) => clicked.push(clickedFeature),
    }) as any[];

    expect(layer.props.data).toBe(context.features);
    expect(layer.props.getPath(feature)).toEqual([
      [-73.9, 40.7, 1000],
      [-73.8, 40.8, 2000],
    ]);
    expect(layer.props.getTimestamps(feature)).toEqual([1000, 2000]);
    expect(layer.props.getWidth(feature, { index: 0, data: [feature], target: [] })).toBe(7);

    layer.props.onClick({ object: feature });

    expect(clicked).toEqual([feature]);
  });

  it('filters invalid trip shapes via getFilterValue and returns empty path for them', () => {
    const valid = createFeature(
      [
        [-73.9, 40.7, 1000],
        [-73.8, 40.8, 2000],
      ],
      { trip_times: [1000, 2000] },
      0,
    );
    const tooShort = createFeature([[-73.9, 40.7, 1000]], {}, 1);
    const mismatchedTimestamps = createFeature(
      [
        [-73.7, 40.6],
        [-73.6, 40.5],
      ],
      { trip_times: [1000] },
      2,
    );
    const config = createConfig({
      settings: {
        ...createConfig().settings,
        timestamps: createSourceRef('trip_times'),
      },
    });

    const [layer] = tripsLayerDefinition.renderLayers({
      ...createContext(config, [valid, tooShort, mismatchedTimestamps]),
      timeFilterFlags: new Uint8Array([1, 1, 1]),
    }) as any[];

    expect(layer.props.data).toHaveLength(3);
    // getFilterValue from createCommonLayerProps is index-based on timeFilterFlags
    expect(layer.props.getFilterValue(valid)).toBe(1);
    expect(layer.props.getFilterValue(tooShort)).toBe(1);
    expect(layer.props.getFilterValue(mismatchedTimestamps)).toBe(1);
    // getPath handles validity: >= 2 coords → path, otherwise []
    expect(layer.props.getPath(tooShort)).toEqual([]);
    expect(layer.props.getPath(mismatchedTimestamps)).toEqual([
      [-73.7, 40.6],
      [-73.6, 40.5],
    ]);
  });

  it('parses timestamp field values from arrays, JSON strings, and comma-separated strings', () => {
    const arrayFeature = createFeature(
      [
        [-73.9, 40.7],
        [-73.8, 40.8],
      ],
      { trip_times: [1, 2] },
      0,
    );
    const jsonFeature = createFeature(
      [
        [-73.7, 40.6],
        [-73.6, 40.5],
      ],
      { trip_times: '[3,4]' },
      1,
    );
    const csvFeature = createFeature(
      [
        [-73.5, 40.4],
        [-73.4, 40.3],
      ],
      { trip_times: '5, 6' },
      2,
    );
    const config = createConfig({
      settings: {
        ...createConfig().settings,
        timestamps: createSourceRef('trip_times'),
      },
    });

    const [layer] = tripsLayerDefinition.renderLayers(createContext(config, [arrayFeature, jsonFeature, csvFeature])) as any[];

    expect(layer.props.getTimestamps(arrayFeature)).toEqual([1, 2]);
    expect(layer.props.getTimestamps(jsonFeature)).toEqual([3, 4]);
    expect(layer.props.getTimestamps(csvFeature)).toEqual([5, 6]);
  });

  it('uses row-level timeFilterFlags while keeping feature identity stable across cursor changes', () => {
    const feature = createFeature(
      [
        [-73.9, 40.7, 1000],
        [-73.8, 40.8, 2000],
      ],
      {},
      0,
    );
    const config = createConfig();
    const sharedFeatures = [feature];

    const [firstLayer] = tripsLayerDefinition.renderLayers({
      ...createContext(config, sharedFeatures),
      cursorTimeMs: 1000,
      timeFilterFlags: new Uint8Array([1]),
    }) as any[];
    const [secondLayer] = tripsLayerDefinition.renderLayers({
      ...createContext(config, sharedFeatures),
      cursorTimeMs: 2000,
      timeFilterFlags: new Uint8Array([0]),
    }) as any[];

    expect(firstLayer.props.data).toBe(sharedFeatures);
    expect(secondLayer.props.data).toBe(sharedFeatures);
    expect(firstLayer.props.currentTime).toBe(1000);
    expect(secondLayer.props.currentTime).toBe(2000);
    expect(firstLayer.props.getFilterValue(feature)).toBe(1);
    expect(secondLayer.props.getFilterValue(feature)).toBe(-1);
  });
});
