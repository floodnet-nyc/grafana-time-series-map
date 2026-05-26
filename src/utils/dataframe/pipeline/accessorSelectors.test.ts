import type { AccessorContext } from '@deck.gl/core';
import type { Feature } from 'geojson';
import type { LayerConfig } from '../../../layers';
import { createSourceRef } from '../../../layers/defaults';
import type { ScatterplotLayerConfig } from '../../../layers/scatterplot';
import { selectAccessorFactories } from './accessorSelectors';
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

function createFeature(properties: Record<string, unknown>): Feature {
  return {
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [0, 0] },
    properties,
  };
}

describe('accessorSelectors', () => {
  it('resolves local, derived, joined, and numeric default values', () => {
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
      derivedFields: [{ as: 'depthDiff', expression: 'A.depth - this.contour_depth_inches', type: 'number' }],
    });
    const feature = createFeature({ deployment_id: 'sensor-1', contour_depth_inches: 2 });
    const joinedSourceValues = new Map([['A', new Map([['sensor-1', { depth: 5 }]])]]);
    const derivedValues = [{ depthDiff: 3 }];
    const table = featureArrayToLayerTable([{ ...feature, __idx: 0 }] as any, 'main');
    const context = { index: 0 } as AccessorContext<any>;
    const datum = { __idx: 0 };
    const { getAccessor, getAccessors } = selectAccessorFactories({ config, table, joinedSourceValues, derivedValues });

    const [getDerived] = getAccessor(createSourceRef('depthDiff'));
    const [getJoined] = getAccessor({ source: 'A', field: 'depth' });
    const [getLocal] = getAccessor(createSourceRef('contour_depth_inches'));
    const [getMissingNumeric] = getAccessors.number({ source: 'A', field: 'missing' }, 7);

    expect(getDerived?.(datum, context)).toBe(3);
    expect(getJoined?.(datum, context)).toBe(5);
    expect(getLocal?.(datum, context)).toBe(2);
    expect(getMissingNumeric?.(datum, context)).toBe(7);
  });
});
