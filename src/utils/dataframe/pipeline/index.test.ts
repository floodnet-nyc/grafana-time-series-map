import type { AccessorContext, Layer } from '@deck.gl/core';
import type { Feature } from 'geojson';
jest.mock('../../layers', () => ({
  layerDefinitions: [],
}));
jest.mock('../../extensions', () => ({
  layerExtensionDefinitions: [],
}));
import {
  buildJoinedSourceValuesByLayerId,
  buildPreparedLayerStates,
  selectAccessorFactories,
  selectDerivedValues,
  selectPreparedLayerState,
  buildTimeFilterFlagsByLayerId,
  renderPreparedLayers,
  type PreparedLayerState,
  compileDerivedFields,
} from '.';
import { buildPacked } from '../closestTimeFiltering';
import type { MapPanelOptions } from '../../../types';
import type { LayerConfig } from '../../../layers';
import { createSourceRef } from '../../../layers/defaults';
import type { ScatterplotLayerConfig } from '../../../layers/scatterplot';
import type { GeoFeature } from '../toGeoJsonFeatures';
import type { GetAccessorFunction, GetAccessorFunctions } from '../../../layers/types';

function createLayerConfig(overrides: Partial<LayerConfig> = {}): LayerConfig {
  const base: ScatterplotLayerConfig = {
    id: 'layer-1',
    type: 'scatterplot',
    label: 'Layer 1',
    visible: true,
    data: { featureSource: { id: 'main', refId: '' } },
    settings: {
      radiusMinPixels: 4,
      radiusMaxPixels: 20,
      radius: createSourceRef(),
      radiusScale: 1,
      elevation: createSourceRef(),
      elevationScale: 1,
      depthTest: false,
      stroked: true,
      showLabels: false,
      label: createSourceRef(),
    },
    geometry: { type: 'none' },
    timeFilter: { mode: 'none', time: createSourceRef('time') },
    opacity: 1,
  };
  return { ...base, ...overrides } as LayerConfig;
}

function createFeature(properties: Record<string, unknown>, id?: string, index = 0): GeoFeature {
  return {
    type: 'Feature',
    id,
    geometry: { type: 'Point', coordinates: [0, 0] },
    properties,
    __idx: index,
  };
}

function createOptions(overrides: Partial<MapPanelOptions> = {}): MapPanelOptions {
  return {
    basemap: { provider: 'maplibre', maplibre: { mapStyle: 'carto-dark' }, google: {} },
    deck: { parameters: {}, lighting: {}, interleaved: true },
    initialView: { mode: 'manual', state: { latitude: 0, longitude: 0, zoom: 1 } },
    layers: [],
    time: { show: false, defaultSpeed: 1, loop: false },
    legend: { show: true },
    tooltip: { show: true },
    popup: { show: true },
    sync: { publish: true, subscribe: true },
    ...overrides,
  };
}

function createAccessors(): Pick<PreparedLayerState, 'getAccessor' | 'getAccessors'> {
  const getAccessor: GetAccessorFunction = (fieldName, defaultValue) => [
    fieldName?.field ? (feature) => feature.properties?.[fieldName.field] ?? defaultValue : undefined,
    [fieldName?.source, fieldName?.field, defaultValue],
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
    numericArray: getAccessor as any,
  };
  return { getAccessor, getAccessors };
}

describe('panelLayersModel', () => {
  it('builds window time-filter flags with tolerance', () => {
    const config = createLayerConfig({
      timeFilter: { mode: 'window', time: createSourceRef('time'), windowToleranceMs: 100 },
    });
    const featuresByLayerId = new Map([
      [
        config.id,
        [
          createFeature({ time: 900 }, undefined, 0),
          createFeature({ time: 1500 }, undefined, 1),
          createFeature({ time: 2201 }, undefined, 2),
        ],
      ],
    ]);

    const flags = buildTimeFilterFlagsByLayerId([config], featuresByLayerId, new Map(), 0, 1000, 2100);
    expect(Array.from(flags.get(config.id) ?? [])).toEqual([1, 1, 0]);
  });

  it('builds as-of time-filter flags from packed series', () => {
    const config = createLayerConfig({
      timeFilter: { mode: 'asof', time: createSourceRef('time'), groupBy: createSourceRef('deployment_id'), maxLagMs: 1000 },
    });
    const features = [
      createFeature({ deployment_id: 'a', time: 1000 }, 'a-1', 0),
      createFeature({ deployment_id: 'a', time: 2000 }, 'a-2', 1),
      createFeature({ deployment_id: 'b', time: 1200 }, 'b-1', 2),
    ];
    const featuresByLayerId = new Map([[config.id, features]]);
    const packedByLayerId = new Map([
      [config.id, buildPacked('geojson', features, 'deployment_id', 'time')],
    ]);

    const flags = buildTimeFilterFlagsByLayerId([config], featuresByLayerId, packedByLayerId, 2100, 0, 0);
    expect(Array.from(flags.get(config.id) ?? [])).toEqual([0, 1, 1]);
  });

  it('builds prepared layer state objects from feature and joined source maps', () => {
    const config = createLayerConfig({
      data: {
        featureSource: { id: 'main', refId: '' },
        joinedSources: [
        {
          id: 'A',
          refId: 'A',
          join: {
            type: 'asof',
            localKey: createSourceRef('deployment_id'),
            remoteKey: 'deployment_id',
            time: 'time',
          },
          fields: [{ field: 'depth' }],
        },
      ],
      },
      derivedFields: [
        {
          as: 'depthDiff',
          expression: 'A.depth - this.contour_depth_inches',
          type: 'number',
        },
      ],
    });
    const features = [createFeature({ time: 1000, deployment_id: 'sensor-1', contour_depth_inches: 2 }, undefined, 0)];
    const featuresByLayerId = new Map([[config.id, features]]);
    const flagsByLayerId = new Map([[config.id, new Uint8Array([1])]]);
    const joinedSourceValues = new Map([
      [config.id, new Map([['A', new Map([['sensor-1', { depth: 5 }]])]])],
    ]);

    const [state] = buildPreparedLayerStates([config], featuresByLayerId, flagsByLayerId, joinedSourceValues);

    expect(state.config).toBe(config);
    expect(state.features).toEqual(features);
    expect(state.timeFilterFlags).toEqual(new Uint8Array([1]));
    expect(state.joinedSourceValues).toEqual(new Map([['A', new Map([['sensor-1', { depth: 5 }]])]]));
    expect(state.derivedValues).toEqual([{ depthDiff: 3 }]);
    expect(state.getAccessor).toEqual(expect.any(Function));
    expect(state.getAccessors.number).toEqual(expect.any(Function));
    expect(state.getAccessors.date).toEqual(expect.any(Function));
  });

  it('builds derived values without mutating the feature objects', () => {
    const config = createLayerConfig({
      derivedFields: [
        {
          as: 'depthDouble',
          expression: 'this.depth * 2',
          type: 'number',
        },
      ],
    });
    const features = [createFeature({ depth: 4 }, undefined, 0)];

    const derivedValues = selectDerivedValues(compileDerivedFields(config), config, features);

    expect(derivedValues).toEqual([{ depthDouble: 8 }]);
    expect((features[0] as GeoFeature & { __derived?: Record<string, unknown> }).__derived).toBeUndefined();
  });

  it('builds accessor factories against local, derived, and joined values', () => {
    const config = createLayerConfig({
      data: {
        featureSource: { id: 'main', refId: '' },
        joinedSources: [
          {
            id: 'A',
            refId: 'A',
            join: {
              type: 'asof',
              localKey: createSourceRef('deployment_id'),
              remoteKey: 'deployment_id',
              time: 'time',
            },
            fields: [{ field: 'depth' }],
          },
        ],
      },
      derivedFields: [
        {
          as: 'depthDiff',
          expression: 'A.depth - this.contour_depth_inches',
          type: 'number',
        },
      ],
    });
    const features = [createFeature({ deployment_id: 'sensor-1', contour_depth_inches: 2 }, undefined, 0)];
    const joinedSourceValues = new Map([
      ['A', new Map([['sensor-1', { depth: 5 }]])],
    ]);
    const derivedValues = [{ depthDiff: 3 }];
    const { getAccessor, getAccessors } = selectAccessorFactories({ config, joinedSourceValues, derivedValues });

    const [getDerived] = getAccessor(createSourceRef('depthDiff'));
    const [getJoined] = getAccessor({ source: 'A', field: 'depth' });
    const [getLocal] = getAccessor(createSourceRef('contour_depth_inches'));
    const [getMissingNumeric] = getAccessors.number({ source: 'A', field: 'missing' }, 7);

    expect(getDerived?.(features[0], { index: 0 } as AccessorContext<Feature>)).toBe(3);
    expect(getJoined?.(features[0], { index: 0 } as AccessorContext<Feature>)).toBe(5);
    expect(getLocal?.(features[0], { index: 0 } as AccessorContext<Feature>)).toBe(2);
    expect(getMissingNumeric?.(features[0], { index: 0 } as AccessorContext<Feature>)).toBe(7);
  });

  it('composes a prepared layer state from selector inputs', () => {
    const config = createLayerConfig({
      derivedFields: [
        {
          as: 'depthDouble',
          expression: 'this.depth * 2',
          type: 'number',
        },
      ],
    });
    const features = [createFeature({ depth: 4 }, undefined, 0)];

    const state = selectPreparedLayerState({
      config,
      features,
      timeFilterFlags: new Uint8Array([1]),
    });

    expect(state.features).toBe(features);
    expect(state.timeFilterFlags).toEqual(new Uint8Array([1]));
    expect(state.derivedValues).toEqual([{ depthDouble: 8 }]);
  });

  it('resolves keyed as-of joined source values at the current cursor time', () => {
    const config = createLayerConfig({
      data: {
        featureSource: { id: 'main', refId: '' },
        joinedSources: [
        {
          id: 'B',
          refId: 'B',
          join: {
            type: 'asof',
            localKey: createSourceRef('deployment_id'),
            remoteKey: 'deployment_id',
            time: 'time',
            maxLagMs: 1000,
          },
          fields: [{ field: 'depth' }],
        },
      ],
      },
    });

    const sourceFeatures = [
      createFeature({ deployment_id: 'sensor-1', time: 1000, depth: 3 }, undefined, 0),
      createFeature({ deployment_id: 'sensor-1', time: 2000, depth: 5 }, undefined, 1),
      createFeature({ deployment_id: 'sensor-2', time: 1500, depth: 7 }, undefined, 2),
    ];
    const packedByLayerId = new Map([
      [
        config.id,
        new Map([
          [
            'B',
            {
              features: sourceFeatures,
              packed: buildPacked('geojson', sourceFeatures, 'deployment_id', 'time'),
            },
          ],
        ]),
      ],
    ]);

    const valuesByLayerId = buildJoinedSourceValuesByLayerId([config], packedByLayerId, 2100);

    expect(valuesByLayerId.get(config.id)).toEqual(
      new Map([
        [
          'B',
          new Map([
            ['sensor-1', { depth: 5 }],
            ['sensor-2', { depth: 7 }],
          ]),
        ],
      ])
    );
  });

  it('renders prepared layers in order and skips hidden or unknown types', () => {
    const visibleConfig = createLayerConfig({ id: 'visible', type: 'scatterplot' });
    const hiddenConfig = createLayerConfig({ id: 'hidden', type: 'scatterplot', visible: false });
    const missingConfig = createLayerConfig({ id: 'missing', type: 'line' });
    const accessors = createAccessors();
    const preparedLayerStates: PreparedLayerState[] = [
      { config: visibleConfig, features: [createFeature({ value: 1 }, undefined, 0)], timeFilterFlags: new Uint8Array([1]), ...accessors },
      { config: hiddenConfig, features: [createFeature({ value: 2 }, undefined, 0)], timeFilterFlags: new Uint8Array([1]), ...accessors },
      { config: missingConfig, features: [createFeature({ value: 3 }, undefined, 0)], timeFilterFlags: new Uint8Array([1]), ...accessors },
    ];

    const renderer = {
      type: 'scatterplot',
      label: 'Known',
      createDefaultConfig: () => visibleConfig,
      editorSections: [],
      renderLayers: (ctx: any) =>
        [{ id: `deck-${ctx.config.id}` } as Layer],
    };

    const rendered = renderPreparedLayers({
      preparedLayerStates,
      options: createOptions({ layers: [visibleConfig, hiddenConfig, missingConfig] }),
      cursorTimeMs: 1500,
      fromTimeMs: 1000,
      toTimeMs: 2000,
      selectedKey: 'sensor-1',
      getRenderer: (type) => (type === 'scatterplot' ? (renderer as any) : undefined),
      applyExtensions: (layers) => layers,
    });

    expect(rendered).toEqual([{ id: 'deck-visible' }]);
  });
});
