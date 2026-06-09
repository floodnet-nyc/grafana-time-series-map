import type { DataFrame } from '@grafana/data';
import { FieldType } from '@grafana/data';
import { createSourceRef } from '../layers/defaults';
import { dataFramesToLayerTable } from './dataframe/layerTable';
import { selectPreparedLayerState } from './dataframe/pipeline/preparedLayerSelectors';
import { buildPopupSelectionContext } from './popupSelection';

function createFrame(refId: string, fields: DataFrame['fields']): DataFrame {
  return {
    refId,
    fields,
    length: fields[0]?.values.length ?? 0,
  } as DataFrame;
}

function createBaseLayer(id: string, label: string, refId: string, visible = true) {
  return {
    id,
    type: 'scatterplot',
    label,
    visible,
    data: { featureSource: { id: 'main', refId } },
    settings: {},
    geometry: { type: 'none' as const },
    timeFilter: { mode: 'none' as const, time: createSourceRef() },
    opacity: 1,
    selectionKey: createSourceRef('deployment_id'),
  };
}

describe('buildPopupSelectionContext', () => {
  it('builds per-layer matches and picks closest-time representatives', () => {
    const layerA = {
      ...createBaseLayer('A', 'Layer A', 'A'),
      data: {
        featureSource: { id: 'main', refId: 'A' },
        joinedSources: [
          {
            id: 'details',
            refId: 'J',
            join: {
              type: 'asof' as const,
              localKey: createSourceRef('deployment_id'),
              remoteKey: 'deployment_id',
              time: 'time',
            },
            fields: [],
          },
        ],
      },
      derivedFields: [{ as: 'depthDouble', expression: 'this.depth * 2', type: 'number' as const }],
    };
    const layerB = createBaseLayer('B', 'Layer B', 'B');
    const layerC = createBaseLayer('C', 'Layer C', 'C');

    const tableA = dataFramesToLayerTable(
      [
        createFrame('A', [
          { name: 'deployment_id', type: FieldType.string, values: ['sensor-1', 'sensor-1', 'sensor-2'] } as any,
          { name: 'time', type: FieldType.time, values: [1000, 1700, 1800] } as any,
          { name: 'depth', type: FieldType.number, values: [2, 5, 9] } as any,
          { name: 'name', type: FieldType.string, values: ['alpha-old', 'alpha-new', 'beta'] } as any,
        ]),
      ],
      'A',
      { type: 'none' },
      undefined
    );
    const tableB = dataFramesToLayerTable(
      [
        createFrame('B', [
          { name: 'deployment_id', type: FieldType.string, values: ['sensor-1', 'sensor-1'] } as any,
          { name: 'summary', type: FieldType.string, values: ['first', 'second'] } as any,
        ]),
      ],
      'B',
      { type: 'none' },
      undefined
    );
    const tableC = dataFramesToLayerTable(
      [
        createFrame('C', [
          { name: 'deployment_id', type: FieldType.string, values: ['sensor-2'] } as any,
          { name: 'status', type: FieldType.string, values: ['dry'] } as any,
        ]),
      ],
      'C',
      { type: 'none' },
      undefined
    );

    const preparedA = selectPreparedLayerState({
      config: layerA as any,
      table: tableA,
      joinedSourceValues: new Map([['details', new Map([['sensor-1', { status: 'wet' }]])]]),
    });
    const preparedB = selectPreparedLayerState({ config: layerB as any, table: tableB });
    const preparedC = selectPreparedLayerState({ config: layerC as any, table: tableC });

    const context = buildPopupSelectionContext([preparedA, preparedB, preparedC], 'sensor-1', 1600);

    expect(context).not.toBeNull();
    expect(context?.matches.A).toHaveLength(2);
    expect(context?.match.A?.name).toBe('alpha-new');
    expect(context?.match.A?.depthDouble).toBe(10);
    expect((context?.match.A as any)?.details.status).toBe('wet');
    expect(context?.matches.B).toHaveLength(2);
    expect(context?.match.B?.summary).toBe('first');
    expect(context?.matches.C).toEqual([]);
    expect(context?.match.C).toBeNull();
    expect(context?.primary?.layerId).toBe('A');
    expect(context?.flatMatches).toHaveLength(4);
  });

  it('falls back to the first matching layer when no matches are visible', () => {
    const layerA = createBaseLayer('A', 'Layer A', 'A', false);
    const layerB = createBaseLayer('B', 'Layer B', 'B', false);

    const tableA = dataFramesToLayerTable(
      [createFrame('A', [{ name: 'deployment_id', type: FieldType.string, values: ['sensor-1'] } as any])],
      'A',
      { type: 'none' },
      undefined
    );
    const tableB = dataFramesToLayerTable(
      [createFrame('B', [{ name: 'deployment_id', type: FieldType.string, values: ['sensor-1'] } as any])],
      'B',
      { type: 'none' },
      undefined
    );

    const context = buildPopupSelectionContext(
      [
        selectPreparedLayerState({ config: layerA as any, table: tableA }),
        selectPreparedLayerState({ config: layerB as any, table: tableB }),
      ],
      'sensor-1',
      1500
    );

    expect(context?.primary?.layerId).toBe('A');
  });
});
