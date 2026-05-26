import type { Feature } from 'geojson';
import type { LayerConfig } from '../../../layers';
import { createSourceRef } from '../../../layers/defaults';
import type { ScatterplotLayerConfig } from '../../../layers/scatterplot';
import { buildFieldSourceMap, compileDerivedFields, selectDerivedValues } from './derivedFieldSelectors';
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

describe('derivedFieldSelectors', () => {
  it('builds field source precedence with derived fields overriding local fields', () => {
    const config = createLayerConfig({
      derivedFields: [{ as: 'depth', expression: 'this.depth * 2', type: 'number' }],
    });
    const table = featureArrayToLayerTable(
      [{ ...createFeature({ depth: 4, payload: { value: 3 } }), __idx: 0 }] as any,
      'main'
    );

    expect(buildFieldSourceMap(config, table)).toEqual(
      new Map([
        ['depth', 'derived'],
        ['payload', 'main'],
      ])
    );
  });

  it('evaluates derived fields from local and joined values without mutating the feature', () => {
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
    const table = featureArrayToLayerTable([{ ...feature, __idx: 0 }] as any, 'main');

    const derivedValues = selectDerivedValues(compileDerivedFields(config), config, table, joinedSourceValues);

    expect(derivedValues).toEqual([{ depthDiff: 3 }]);
    expect((feature as Feature & { __derived?: Record<string, unknown> }).__derived).toBeUndefined();
  });

  it('isolates expression failures to the current derived field', () => {
    const config = createLayerConfig({
      derivedFields: [
        { as: 'ok', expression: 'this.depth * 2', type: 'number' },
        { as: 'bad', expression: '(', type: 'number' },
      ],
    });

    const derivedValues = selectDerivedValues(
      compileDerivedFields(config),
      config,
      featureArrayToLayerTable([{ ...createFeature({ depth: 4 }), __idx: 0 }] as any, 'main')
    );

    expect(derivedValues).toEqual([{ ok: 8 }]);
  });

  it('resolves nested local object paths through the field source map', () => {
    const config = createLayerConfig({
      derivedFields: [{ as: 'valueDouble', expression: 'payload.value * 2', type: 'number' }],
    });

    const derivedValues = selectDerivedValues(
      compileDerivedFields(config),
      config,
      featureArrayToLayerTable([{ ...createFeature({ payload: { value: 4 } }), __idx: 0 }] as any, 'main')
    );

    expect(derivedValues).toEqual([{ valueDouble: 8 }]);
  });

  it('lets bare identifiers prefer previously derived values over local fields', () => {
    const config = createLayerConfig({
      derivedFields: [
        { as: 'depth', expression: 'this.depth * 2', type: 'number' },
        { as: 'depthPlusOne', expression: 'depth + 1', type: 'number' },
      ],
    });

    const derivedValues = selectDerivedValues(
      compileDerivedFields(config),
      config,
      featureArrayToLayerTable([{ ...createFeature({ depth: 4 }), __idx: 0 }] as any, 'main')
    );

    expect(derivedValues).toEqual([{ depth: 8, depthPlusOne: 9 }]);
  });

  it('preserves index as an explicit resolver namespace', () => {
    const config = createLayerConfig({
      derivedFields: [{ as: 'rowNumber', expression: 'index + 1', type: 'number' }],
    });

    const derivedValues = selectDerivedValues(
      compileDerivedFields(config),
      config,
      featureArrayToLayerTable(
        [
          { ...createFeature({ depth: 4 }), __idx: 0 },
          { ...createFeature({ depth: 5 }), __idx: 1 },
        ] as any,
        'main'
      )
    );

    expect(derivedValues).toEqual([{ rowNumber: 1 }, { rowNumber: 2 }]);
  });
});
