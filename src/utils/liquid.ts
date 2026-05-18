import { Liquid } from 'liquidjs';
import type { Feature } from 'geojson';

export const liquid = new Liquid({ strictVariables: false, strictFilters: false });

// ── Liquid filters for tooltip templates ──────────────────────────────────────

liquid.registerFilter('pretty', (value: unknown) => {
  if (value === null || value === undefined) return '—';

  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return String(value);
    return Number.isInteger(value) ? String(value) : Number(value.toFixed(4)).toString();
  }

  if (value instanceof Date) {
    return value.toLocaleString();
  }

  if (typeof value === 'string') {
    // try parsing as ISO date
    const d = new Date(value);
    if (!isNaN(d.getTime()) && /\d{4}-\d{2}-\d{2}/.test(value)) {
      return d.toLocaleString();
    }
    return value;
  }

  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }

  if (typeof value === 'object') {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }

  return String(value);
});

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
