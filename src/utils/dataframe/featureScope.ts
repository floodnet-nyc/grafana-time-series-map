import type { Feature } from 'geojson';
import type { LayerConfig } from 'layers';
import type { SourceRef } from '../../types';

function getSourceRefValue(feature: Feature, ref: SourceRef | undefined, derived?: Record<string, unknown>) {
  if (!ref?.field) {
    return '';
  }
  if (ref.source === 'derived') {
    return derived?.[ref.field] ?? '';
  }
  return derived?.[ref.field] ?? feature.properties?.[ref.field] ?? '';
}

interface BuildFeatureScopeArgs {
  config: LayerConfig;
  feature: Feature;
  joinedSourceValues?: Map<string, Map<string, Record<string, unknown>>>;
  derivedRow?: Record<string, unknown>;
}

export function buildFeatureScope({
  config,
  feature,
  joinedSourceValues,
  derivedRow,
}: BuildFeatureScopeArgs) {
  const primary = { ...(feature.properties ?? {}) };
  const sources: Record<string, Record<string, unknown>> = {};

  for (const joinedSource of config.data.joinedSources ?? []) {
    const localKey = String(getSourceRefValue(feature, joinedSource.join.localKey, derivedRow) ?? '');
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
