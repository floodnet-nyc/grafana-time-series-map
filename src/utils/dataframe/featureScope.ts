import type { LayerConfig } from 'layers';
import type { SourceRef } from '../../types';
import { getRowProperties, getRowValue, type LayerTable } from './layerTable';

function getSourceRefValue(
  table: LayerTable,
  index: number,
  ref: SourceRef | undefined,
  derived?: Record<string, unknown>
) {
  if (!ref?.field) {
    return '';
  }
  if (ref.source === 'derived') {
    return derived?.[ref.field] ?? '';
  }
  return derived?.[ref.field] ?? getRowValue(table, index, ref.field) ?? '';
}

interface BuildFeatureScopeArgs {
  config: LayerConfig;
  table: LayerTable;
  index: number;
  joinedSourceValues?: Map<string, Map<string, Record<string, unknown>>>;
  derivedRow?: Record<string, unknown>;
}

export function buildFeatureScope({ config, table, index, joinedSourceValues, derivedRow }: BuildFeatureScopeArgs) {
  const primary = getRowProperties(table, index);
  const sources: Record<string, Record<string, unknown>> = {};

  for (const joinedSource of config.data.joinedSources ?? []) {
    const localKey = String(getSourceRefValue(table, index, joinedSource.join.localKey, derivedRow) ?? '');
    const values = joinedSourceValues?.get(joinedSource.id)?.get(localKey) ?? {};
    sources[joinedSource.id] = values;
  }

  return {
    ...primary,
    ...(derivedRow ?? {}),
    this: primary,
    ...sources,
    derived: derivedRow ?? {},
    layer: config,
  };
}
