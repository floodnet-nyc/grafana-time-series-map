import type { LayerConfig } from '../../../layers';
import { createSourceRef } from '../../../layers/defaults';
import type { ScatterplotLayerConfig } from '../../../layers/scatterplot';
import type { GeoFeature } from '../toGeoJsonFeatures';
import { buildPreparedLayerStates, selectPreparedLayerState } from './preparedLayerSelectors';
import { featureArrayToLayerTable } from '../layerTable';

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

function createFeature(properties: Record<string, unknown>, index = 0): GeoFeature {
  return {
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [0, 0] },
    properties,
    __idx: index,
  };
}

describe('preparedLayerSelectors', () => {
  it('composes a prepared layer state from selector inputs', () => {
    const config = createLayerConfig({
      derivedFields: [{ as: 'depthDouble', expression: 'this.depth * 2', type: 'number' }],
    });
    const features = [createFeature({ depth: 4 }, 0)];
    const table = featureArrayToLayerTable(features as any, 'main');

    const state = selectPreparedLayerState({
      config,
      table,
      timeFilterFlags: new Uint8Array([1]),
    });

    expect(state.features).toBe(features);
    expect(state.timeFilterFlags).toEqual(new Uint8Array([1]));
    expect(state.derivedValues).toEqual([{ depthDouble: 8 }]);
  });

  it('builds prepared states for each layer config', () => {
    const config = createLayerConfig({ id: 'layer-a' });
    const featuresByLayerId = new Map([
      [config.id, featureArrayToLayerTable([createFeature({ depth: 1 }, 0)] as any, 'main')],
    ]);
    const flagsByLayerId = new Map([[config.id, new Uint8Array([1])]]);

    const [state] = buildPreparedLayerStates([config], featuresByLayerId, flagsByLayerId);

    expect(state.config).toBe(config);
    expect(state.features).toHaveLength(1);
    expect(state.timeFilterFlags).toEqual(new Uint8Array([1]));
  });
});
