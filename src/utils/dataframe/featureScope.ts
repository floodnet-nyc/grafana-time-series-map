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

export function buildFeatureScope(
  config: LayerConfig,
  feature: Feature,
  joinedSourceValues?: Map<string, Map<string, Record<string, unknown>>>,
  derived?: Record<string, unknown>,
) {
  const primary = { ...(feature.properties ?? {}) };
  const sources: Record<string, Record<string, unknown>> = {};

  for (const joinedSource of config.data.joinedSources ?? []) {
    const localKey = String(getSourceRefValue(feature, joinedSource.join.localKey, derived) ?? '');
    const values = joinedSourceValues?.get(joinedSource.id)?.get(localKey) ?? {};
    sources[joinedSource.id] = values;
  }

  return {
    ...primary,
    ...derived ?? {},
    this: primary,
    ...sources,
    derived: derived ?? {},
    layer: config,
  };
}
