import { Liquid } from 'liquidjs';
import type { Feature } from 'geojson';

export const liquid = new Liquid({ strictVariables: false, strictFilters: false });

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

export function buildLiquidScope(properties: Record<string, unknown>, selectedKey?: string) {
  const entries = Object.entries(properties).filter(([k]) => !k.startsWith('__'));
  return {
    _key: selectedKey ?? '',
    ...Object.fromEntries(entries),
    properties: entries.map(([key, value]) => ({ key, value })),
  };
}

export function renderLiquidTemplate(template: string, scope: Record<string, unknown>): string | null {
  try {
    return liquid.renderSync(liquid.parse(template), scope).trim() || null;
  } catch {
    return null;
  }
}
