import type { Feature } from 'geojson';
import type { LayerConfig } from '../../../layers';
import type { GetAccessorFunction, GetAccessorFunctions } from '../../../layers/types';
import { buildFeatureCollection, coerceLayerTable, type LayerTable, type LayerTableLike } from '../layerTable';
import { compileDerivedFields, selectDerivedValues } from './derivedFieldSelectors';
import { selectAccessorFactories } from './accessorSelectors';

export interface PreparedLayerState {
  config: LayerConfig;
  table: LayerTable;
  features?: Array<ReturnType<typeof buildFeatureCollection>[number]> | Feature[];
  timeFilterFlags?: Uint8Array;
  joinedSourceValues?: Map<string, Map<string, Record<string, unknown>>>;
  derivedValues?: Array<Record<string, unknown>>;
  getAccessor: GetAccessorFunction;
  getAccessors: GetAccessorFunctions;
}

export function selectPreparedLayerState({
  config,
  table,
  timeFilterFlags,
  joinedSourceValues,
}: {
  config: LayerConfig;
  table: LayerTable;
  timeFilterFlags: Uint8Array;
  joinedSourceValues?: Map<string, Map<string, Record<string, unknown>>>;
}): PreparedLayerState {
  const derivedFields = compileDerivedFields(config);
  const derivedValues = selectDerivedValues(derivedFields, config, table, joinedSourceValues);
  const accessors = selectAccessorFactories({ config, table, derivedValues, joinedSourceValues });

  return {
    config,
    table,
    features: table.legacyFeatures ?? undefined,
    timeFilterFlags,
    joinedSourceValues,
    derivedValues,
    ...accessors,
  };
}

export function buildPreparedLayerStates(
  layerConfigs: LayerConfig[],
  tablesByLayerId: Map<string, LayerTableLike>,
  flagsByLayerId: Map<string, Uint8Array>,
  joinedSourceValuesByLayerId: Map<string, Map<string, Map<string, Record<string, unknown>>>> = new Map()
): PreparedLayerState[] {
  return layerConfigs.flatMap((config) => {
    const tableLike = tablesByLayerId.get(config.id);
    if (!tableLike) {
      return [];
    }
    const table = coerceLayerTable(tableLike, config.data.featureSource.id);
    return [
      selectPreparedLayerState({
        config,
        table,
        timeFilterFlags: flagsByLayerId.get(config.id),
        joinedSourceValues: joinedSourceValuesByLayerId.get(config.id),
      }),
    ];
  });
}
