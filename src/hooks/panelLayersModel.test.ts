import type { Layer } from '@deck.gl/core';
import {
  buildLookupValuesByLayerId,
  buildSecondarySourceValuesByLayerId,
  buildPreparedLayerStates,
  buildTimeFilterFlagsByLayerId,
  renderPreparedLayers,
  type PreparedLayerState,
} from './panelLayersModel';
import { buildPacked } from '../utils/deckgl/closestTimeFiltering';
import type { LayerRenderer } from '../layers/types';
import type { LayerConfig, MapPanelOptions } from '../types';
import type { GeoFeature } from '../utils/dataframe/toGeoJsonFeatures';

function createLayerConfig(overrides: Partial<LayerConfig> = {}): LayerConfig {
  return {
    id: 'layer-1',
    type: 'scatterplot',
    label: 'Layer 1',
    visible: true,
    geometry: { type: 'none' },
    timeFilter: { mode: 'none', timeField: 'time' },
    fieldMappings: [],
    opacity: 1,
    options: {},
    ...overrides,
  };
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
    basemapProvider: 'maplibre',
    maplibreStyle: 'carto-dark',
    initialViewMode: 'manual',
    initialLatitude: 0,
    initialLongitude: 0,
    initialZoom: 1,
    initialBearing: 0,
    initialPitch: 0,
    layers: [],
    defaultPlaybackSpeed: 1,
    loopPlayback: false,
    showTimeControls: false,
    showLegend: true,
    interleaved: true,
    syncPublish: true,
    syncSubscribe: true,
    ...overrides,
  };
}

describe('panelLayersModel', () => {
  it('builds window time-filter flags with tolerance', () => {
    const config = createLayerConfig({
      timeFilter: { mode: 'window', timeField: 'time', windowToleranceMs: 100 },
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
      timeFilter: { mode: 'asof', timeField: 'time', groupByField: 'deployment_id', maxLagMs: 1000 },
    });
    const features = [
      createFeature({ deployment_id: 'a', time: 1000 }, 'a-1', 0),
      createFeature({ deployment_id: 'a', time: 2000 }, 'a-2', 1),
      createFeature({ deployment_id: 'b', time: 1200 }, 'b-1', 2),
    ];
    const featuresByLayerId = new Map([[config.id, features]]);
    const packedByLayerId = new Map([
      [config.id, buildPacked(features, 'deployment_id', 'time')],
    ]);

    const flags = buildTimeFilterFlagsByLayerId([config], featuresByLayerId, packedByLayerId, 2100, 0, 0);
    expect(Array.from(flags.get(config.id) ?? [])).toEqual([0, 1, 1]);
  });

  it('resolves as-of lookup values at the current cursor time', () => {
    const config = createLayerConfig({
      lookup: {
        queryRefId: 'A',
        keyField: 'deployment_id',
        timeField: 'time',
        fields: [{ sourceField: 'depth', as: 'depth' }],
        maxLagMs: 1000,
      },
    });
    const lookupFeatures = [
      createFeature({ deployment_id: 'sensor-1', time: 1000, depth: 3 }, undefined, 0),
      createFeature({ deployment_id: 'sensor-1', time: 2000, depth: 5 }, undefined, 1),
      createFeature({ deployment_id: 'sensor-2', time: 1500, depth: 7 }, undefined, 2),
    ];
    const lookupPackedByLayerId = new Map([
      [
        config.id,
        {
          features: lookupFeatures,
          packed: buildPacked(lookupFeatures, 'deployment_id', 'time'),
        },
      ],
    ]);

    const lookupValues = buildLookupValuesByLayerId([config], lookupPackedByLayerId, 2100);

    expect(lookupValues.get(config.id)).toEqual(
      new Map([
        ['sensor-1', { depth: 5 }],
        ['sensor-2', { depth: 7 }],
      ])
    );
  });

  it('builds prepared layer state objects from feature and lookup maps', () => {
    const config = createLayerConfig({
      secondarySources: [
        {
          id: 'sensor',
          queryRefId: 'A',
          join: {
            type: 'keyed-asof',
            localKeyField: 'deployment_id',
            remoteKeyField: 'deployment_id',
            timeField: 'time',
          },
          fields: [{ sourceField: 'depth', as: 'depth' }],
        },
      ],
      derivedFields: [
        {
          as: 'depthDiff',
          expression: 'sensor.depth - primary.contour_depth_inches',
          type: 'number',
        },
      ],
    });
    const features = [createFeature({ time: 1000, deployment_id: 'sensor-1', contour_depth_inches: 2 }, undefined, 0)];
    const featuresByLayerId = new Map([[config.id, features]]);
    const flagsByLayerId = new Map([[config.id, new Uint8Array([1])]]);
    const lookupValues = new Map([[config.id, new Map([['sensor-1', { depth: 2 }]])]]);
    const secondarySourceValues = new Map([
      [config.id, new Map([['sensor', new Map([['sensor-1', { depth: 5 }]])]])],
    ]);

    expect(buildPreparedLayerStates([config], featuresByLayerId, flagsByLayerId, lookupValues, secondarySourceValues)).toEqual([
      {
        config,
        features,
        timeFilterFlags: new Uint8Array([1]),
        lookupValues: new Map([['sensor-1', { depth: 2 }]]),
        secondarySourceValues: new Map([['sensor', new Map([['sensor-1', { depth: 5 }]])]]),
        derivedValues: [{ depthDiff: 3 }],
      },
    ]);
  });

  it('resolves keyed as-of secondary source values at the current cursor time', () => {
    const config = createLayerConfig({
      secondarySources: [
        {
          id: 'sensor',
          queryRefId: 'B',
          join: {
            type: 'keyed-asof',
            localKeyField: 'deployment_id',
            remoteKeyField: 'deployment_id',
            timeField: 'time',
            maxLagMs: 1000,
          },
          fields: [{ sourceField: 'depth', as: 'currentDepth' }],
        },
      ],
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
            'sensor',
            {
              features: sourceFeatures,
              packed: buildPacked(sourceFeatures, 'deployment_id', 'time'),
            },
          ],
        ]),
      ],
    ]);

    const valuesByLayerId = buildSecondarySourceValuesByLayerId([config], packedByLayerId, 2100);

    expect(valuesByLayerId.get(config.id)).toEqual(
      new Map([
        [
          'sensor',
          new Map([
            ['sensor-1', { currentDepth: 5 }],
            ['sensor-2', { currentDepth: 7 }],
          ]),
        ],
      ])
    );
  });

  it('renders prepared layers in order and skips hidden or unknown types', () => {
    const visibleConfig = createLayerConfig({ id: 'visible', type: 'known' });
    const hiddenConfig = createLayerConfig({ id: 'hidden', type: 'known', visible: false });
    const missingConfig = createLayerConfig({ id: 'missing', type: 'missing' });
    const preparedLayerStates: PreparedLayerState[] = [
      { config: visibleConfig, features: [createFeature({ value: 1 }, undefined, 0)], timeFilterFlags: new Uint8Array([1]) },
      { config: hiddenConfig, features: [createFeature({ value: 2 }, undefined, 0)], timeFilterFlags: new Uint8Array([1]) },
      { config: missingConfig, features: [createFeature({ value: 3 }, undefined, 0)], timeFilterFlags: new Uint8Array([1]) },
    ];

    const renderer: LayerRenderer = {
      type: 'known',
      label: 'Known',
      defaultOptions: {},
      optionsSchema: [],
      renderLayers: (ctx) =>
        [{ id: `deck-${ctx.config.id}` } as Layer],
    };

    const rendered = renderPreparedLayers({
      preparedLayerStates,
      options: createOptions({ layers: [visibleConfig, hiddenConfig, missingConfig] }),
      cursorTimeMs: 1500,
      fromTimeMs: 1000,
      toTimeMs: 2000,
      selectedKey: 'sensor-1',
      getRenderer: (type) => (type === 'known' ? renderer : undefined),
      applyExtensions: (layers) => layers,
    });

    expect(rendered).toEqual([{ id: 'deck-visible' }]);
  });
});
