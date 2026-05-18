import type { Feature } from 'geojson';
import type { LayerConfig } from 'layers/_all';

export function buildFeatureScope(
  config: LayerConfig,
  feature: Feature,
  secondarySourceValues?: Map<string, Map<string, Record<string, number>>>,
  derived?: Record<string, unknown>,
) {
  const primary = { ...(feature.properties ?? {}) };
  const sources: Record<string, Record<string, unknown>> = {};

  for (const secondarySource of config.secondarySources ?? []) {
    const localKey = String(feature.properties?.[secondarySource.join.localKeyField] ?? '');
    const values = secondarySourceValues?.get(secondarySource.queryRefId)?.get(localKey) ?? {};
    sources[secondarySource.queryRefId] = values;
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
