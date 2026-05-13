import type { Feature } from 'geojson';
import type { LayerConfig } from '../layers/types';

type IndexedFeature = Feature & { __idx?: number };

export function getFeatureIndex(feature: Feature | null | undefined): number | undefined {
  const index = (feature as IndexedFeature | null | undefined)?.__idx;
  return typeof index === 'number' ? index : undefined;
}

export function getFeatureFromDatum(datum: unknown): Feature | null {
  if (!datum || typeof datum !== 'object') {
    return null;
  }

  if ((datum as Feature).type === 'Feature') {
    return datum as Feature;
  }

  const candidate = (datum as { feature?: unknown }).feature;
  return candidate && typeof candidate === 'object' && (candidate as Feature).type === 'Feature'
    ? (candidate as Feature)
    : null;
}

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
