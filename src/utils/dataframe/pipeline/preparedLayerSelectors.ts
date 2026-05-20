import type { Feature } from 'geojson';
import type { LayerConfig } from '../../../layers';
import type { GetAccessorFunction, GetAccessorFunctions } from '../../../layers/types';
import type { PanelFeaturesByLayerId } from '../../../hooks/usePanelLayers';
import { compileDerivedFields, selectDerivedValues } from './derivedFieldSelectors';
import { selectAccessorFactories } from './accessorSelectors';

export interface PreparedLayerState {
  config: LayerConfig;
  features: Feature[];
  timeFilterFlags: Uint8Array;
  joinedSourceValues?: Map<string, Map<string, Record<string, unknown>>>;
  derivedValues?: Array<Record<string, unknown>>;
  getAccessor: GetAccessorFunction;
  getAccessors: GetAccessorFunctions;
}

export function selectPreparedLayerState({
  config,
  features,
  timeFilterFlags,
  joinedSourceValues,
}: {
  config: LayerConfig;
  features: Feature[];
  timeFilterFlags: Uint8Array;
  joinedSourceValues?: Map<string, Map<string, Record<string, unknown>>>;
}): PreparedLayerState {
  const derivedFields = compileDerivedFields(config);
  const derivedValues = selectDerivedValues(derivedFields, config, features, joinedSourceValues);
  const accessors = selectAccessorFactories({ config, derivedValues, joinedSourceValues });

  return {
    config,
    features,
    timeFilterFlags,
    joinedSourceValues,
    derivedValues,
    ...accessors,
  };
}

export function buildPreparedLayerStates(
  layerConfigs: LayerConfig[],
  featuresByLayerId: PanelFeaturesByLayerId,
  flagsByLayerId: Map<string, Uint8Array>,
  joinedSourceValuesByLayerId: Map<string, Map<string, Map<string, Record<string, unknown>>>> = new Map(),
): PreparedLayerState[] {
  return layerConfigs.map((config) =>
    selectPreparedLayerState({
      config,
      features: featuresByLayerId.get(config.id) ?? [],
      timeFilterFlags: flagsByLayerId.get(config.id) ?? new Uint8Array((featuresByLayerId.get(config.id) ?? []).length),
      joinedSourceValues: joinedSourceValuesByLayerId.get(config.id),
    })
  );
}
