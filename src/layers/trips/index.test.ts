import type { Feature } from 'geojson';
import { createSourceRef } from '../defaults';
import type { GetAccessorFunction, GetAccessorFunctions, LayerRenderContext } from '../types';
import { tripsLayerDefinition, type TripsLayerConfig } from './index';
import { featureArrayToLayerTable } from '../../utils/dataframe/layerTable';
import type { PreparedGroupedVectorsState } from '../../utils/dataframe/pipeline';

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

function createFeature(
  coordinates: number[][],
  properties: Record<string, unknown> = {},
  index = 0
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

function createPointFeature(
  coordinates: number[],
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

function createContext(
  config: TripsLayerConfig,
  features: Array<Feature & { __idx: number }>,
  overrides: Partial<LayerRenderContext<TripsLayerConfig>> = {}
): LayerRenderContext<TripsLayerConfig> {
  const getAccessor: GetAccessorFunction = (fieldRef, defaultValue) => [
    fieldRef?.field
      ? (feature: any) => {
          const properties = feature.properties;
          return properties?.[fieldRef.field] ?? defaultValue;
        }
      : undefined,
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
      } catch {
        /* not JSON */
      }
      return trimmed
        .split(',')
        .map((v) => Number(v.trim()))
        .filter(Number.isFinite);
    }
    return defaultValue;
  }

  const getAccessors: GetAccessorFunctions = {
    number: (fieldRef, defaultValue = 0) => {
      const [accessor, deps] = getAccessor(fieldRef, defaultValue);
      return [
        accessor
          ? (feature, ctx) => {
              const sourceFeature = feature as any;
              const source =
                typeof sourceFeature?.__idx === 'number' ? features[sourceFeature.__idx] ?? sourceFeature : sourceFeature;
              const value = accessor(source, ctx);
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
              const sourceFeature = feature as any;
              const source =
                typeof sourceFeature?.__idx === 'number' ? features[sourceFeature.__idx] ?? sourceFeature : sourceFeature;
              const value = accessor(source, ctx);
              return numericArrayFallback(value, defaultValue);
            }
          : undefined,
        deps,
      ];
    },
    geometry: () => [() => null, []],
    pointPosition: (defaultValue = [0, 0] as [number, number]) => [() => defaultValue, []],
    path: (defaultValue = [] as number[][]) => [
      (feature: any) => {
        const sourceFeature = typeof feature?.__idx === 'number' ? features[feature.__idx] ?? feature : feature;
        if (sourceFeature.geometry?.type === 'LineString') {
          return sourceFeature.geometry.coordinates as number[][];
        }
        if (sourceFeature.geometry?.type === 'Point') {
          return defaultValue;
        }
        return defaultValue;
      },
      [],
    ],
    polygon: (defaultValue = [] as number[][][]) => [() => defaultValue, []],
  };

  return {
    config,
    panelOptions: {} as any,
    data: features.map((feature) => ({ __idx: feature.__idx })),
    table: featureArrayToLayerTable(features as any),
    features,
    cursorTimeMs: 123456,
    fromTimeMs: 100000,
    toTimeMs: 200000,
    timeFilterFlags: new Uint8Array(features.map(() => 1)),
    getAccessor,
    getAccessors,
    ...overrides,
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
      0
    );
    const clicked: Feature[] = [];
    const config = createConfig();
    const context = createContext(config, [feature]);

    const [layer] = tripsLayerDefinition.renderLayers({
      ...context,
      onFeatureClick: (clickedFeature) => clicked.push(clickedFeature),
    }) as any[];

    expect(layer.props.data).toBe(context.data);
    expect(layer.props.getPath(feature)).toEqual([
      [-73.9, 40.7, 1000],
      [-73.8, 40.8, 2000],
    ]);
    expect(layer.props.getTimestamps(feature, { index: 0 })).toEqual([1000, 2000]);
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
      0
    );
    const tooShort = createFeature([[-73.9, 40.7, 1000]], {}, 1);
    const mismatchedTimestamps = createFeature(
      [
        [-73.7, 40.6],
        [-73.6, 40.5],
      ],
      { trip_times: [1000] },
      2
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
    expect(layer.props.getFilterValue(valid, { index: 0 })).toBe(1);
    expect(layer.props.getFilterValue(tooShort, { index: 1 })).toBe(-1);
    expect(layer.props.getFilterValue(mismatchedTimestamps, { index: 2 })).toBe(-1);
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
      0
    );
    const jsonFeature = createFeature(
      [
        [-73.7, 40.6],
        [-73.6, 40.5],
      ],
      { trip_times: '[3,4]' },
      1
    );
    const csvFeature = createFeature(
      [
        [-73.5, 40.4],
        [-73.4, 40.3],
      ],
      { trip_times: '5, 6' },
      2
    );
    const config = createConfig({
      settings: {
        ...createConfig().settings,
        timestamps: createSourceRef('trip_times'),
      },
    });

    const [layer] = tripsLayerDefinition.renderLayers(
      createContext(config, [arrayFeature, jsonFeature, csvFeature])
    ) as any[];

    expect(layer.props.getTimestamps(arrayFeature, { index: 0 })).toEqual([1, 2]);
    expect(layer.props.getTimestamps(jsonFeature, { index: 1 })).toEqual([3, 4]);
    expect(layer.props.getTimestamps(csvFeature, { index: 2 })).toEqual([5, 6]);
  });

  it('scales second-based timestamps to milliseconds when configured', () => {
    const feature = createFeature(
      [
        [-73.9, 40.7],
        [-73.8, 40.8],
      ],
      { trip_times: [1191, 1193.803] },
      0
    );
    const config = createConfig({
      settings: {
        ...createConfig().settings,
        timestampUnit: 's',
        timestamps: createSourceRef('trip_times'),
      },
    });

    const [layer] = tripsLayerDefinition.renderLayers(createContext(config, [feature])) as any[];

    expect(layer.props.getTimestamps(feature, { index: 0 })).toEqual([1191000, 1193803]);
  });

  it('scales fallback z-coordinate timestamps to milliseconds when configured', () => {
    const feature = createFeature(
      [
        [-73.9, 40.7, 1191],
        [-73.8, 40.8, 1193.803],
      ],
      {},
      0
    );
    const config = createConfig({
      settings: {
        ...createConfig().settings,
        timestampUnit: 's',
      },
    });

    const [layer] = tripsLayerDefinition.renderLayers(createContext(config, [feature])) as any[];

    expect(layer.props.getTimestamps(feature, { index: 0 })).toEqual([1191000, 1193803]);
  });

  it('uses row-level timeFilterFlags while keeping feature identity stable across cursor changes', () => {
    const feature = createFeature(
      [
        [-73.9, 40.7, 1000],
        [-73.8, 40.8, 2000],
      ],
      {},
      0
    );
    const config = createConfig();
    const sharedFeatures = [feature];
    const firstContext = createContext(config, sharedFeatures);
    const secondContext = createContext(config, sharedFeatures);

    const [firstLayer] = tripsLayerDefinition.renderLayers({
      ...firstContext,
      cursorTimeMs: 1000,
      timeFilterFlags: new Uint8Array([1]),
    }) as any[];
    const [secondLayer] = tripsLayerDefinition.renderLayers({
      ...secondContext,
      cursorTimeMs: 2000,
      timeFilterFlags: new Uint8Array([0]),
    }) as any[];

    expect(firstLayer.props.data).toBe(firstContext.data);
    expect(secondLayer.props.data).toBe(secondContext.data);
    expect(firstLayer.props.currentTime).toBe(1000);
    expect(secondLayer.props.currentTime).toBe(2000);
    expect(firstLayer.props.getFilterValue(feature, { index: 0 })).toBe(1);
    expect(secondLayer.props.getFilterValue(feature, { index: 0 })).toBe(-1);
  });

  it('renders grouped tabular trips from prepared vectors while preserving representative row identity', () => {
    const tripA0 = createPointFeature([-73.9, 40.7], { trip_id: 'A', time: 1000, width_value: 2 }, 0);
    const tripA1 = createPointFeature([-73.8, 40.8], { trip_id: 'A', time: 2000, width_value: 5 }, 1);
    const tripB0 = createPointFeature([-73.7, 40.6], { trip_id: 'B', time: 1500, width_value: 3 }, 2);
    const tripB1 = createPointFeature([-73.6, 40.5], { trip_id: 'B', time: 2500, width_value: 7 }, 3);
    const features = [tripA0, tripA1, tripB0, tripB1];
    const config = createConfig({
      geometry: {
        type: 'latlng',
        lat: createSourceRef('lat'),
        lng: createSourceRef('lng'),
      } as any,
      timeFilter: {
        mode: 'asof',
        time: createSourceRef('time'),
        groupBy: createSourceRef('trip_id'),
      },
    });
    const groupedVectors: PreparedGroupedVectorsState = {
      data: [{ __idx: 1 }, { __idx: 2 }],
      pathByIndex: new Map([
        [
          1,
          [
            [-73.9, 40.7],
            [-73.8, 40.8],
          ],
        ],
        [
          2,
          [
            [-73.7, 40.6],
            [-73.6, 40.5],
          ],
        ],
      ]),
      numericArrayByField: new Map([
        [
          'time',
          new Map([
            [1, [1000, 2000]],
            [2, [1500, 2500]],
          ]),
        ],
      ]),
    };
    const baseContext = createContext(config, features);
    const vectorAwareAccessors: GetAccessorFunctions = {
      ...baseContext.getAccessors,
      path: () => [
        (datum) => groupedVectors.pathByIndex.get(datum.__idx) ?? [],
        [groupedVectors.pathByIndex],
      ],
      numericArray: (fieldRef, defaultValue: number[] = []) => [
        fieldRef?.field === 'time'
          ? (datum) => groupedVectors.numericArrayByField.get('time')?.get((datum as any).__idx) ?? defaultValue
          : undefined,
        [fieldRef?.field, groupedVectors.numericArrayByField],
      ],
    };

    const [layer] = tripsLayerDefinition.renderLayers(
      createContext(config, features, {
        data: groupedVectors.data,
        timeFilterFlags: new Uint8Array([1, 1, 1, 1]),
        getAccessors: vectorAwareAccessors,
      })
    ) as any[];

    expect(layer.props.data).toEqual([{ __idx: 1 }, { __idx: 2 }]);
    expect(layer.props.getPath({ __idx: 1 }, { index: 0 })).toEqual([
      [-73.9, 40.7],
      [-73.8, 40.8],
    ]);
    expect(layer.props.getTimestamps({ __idx: 1 }, { index: 0 })).toEqual([1000, 2000]);
    expect(layer.props.getWidth({ __idx: 1 }, { index: 0 })).toBe(5);
    expect(layer.props.getFilterValue({ __idx: 1 }, { index: 0 })).toBe(1);
  });
});
