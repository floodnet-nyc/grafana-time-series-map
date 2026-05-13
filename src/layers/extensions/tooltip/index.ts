import { Liquid } from 'liquidjs';
import type { PickingInfo } from '@deck.gl/core';
import type { Feature } from 'geojson';
import type { DeckTooltipContent } from '../../../components/map/types';

const liquid = new Liquid({ strictVariables: false, strictFilters: false });

export const DEFAULT_TOOLTIP_TEMPLATE = [
  '<table style="border-collapse:collapse;font-size:12px;line-height:1.5">',
  '  {%- for p in properties -%}',
  '  <tr>',
  '    <td style="padding:1px 8px 1px 0;opacity:.7;white-space:nowrap">{{ p.key }}</td>',
  '    <td style="padding:1px 0">{{ p.value }}</td>',
  '  </tr>',
  '  {%- endfor -%}',
  '</table>',
].join('\n');

function getFeatureFromDatum(datum: unknown): Feature | null {
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

function buildScope(properties: Record<string, unknown>) {
  const entries = Object.entries(properties).filter(([k]) => !k.startsWith('__'));
  return {
    ...Object.fromEntries(entries),
    properties: entries.map(([key, value]) => ({ key, value })),
  };
}

export function buildDeckTooltip(template: string): (info: PickingInfo) => DeckTooltipContent {
  let parsed: ReturnType<Liquid['parse']>;
  try {
    parsed = liquid.parse(template);
  } catch (e) {
    console.warn('[timeseriesmap] Failed to parse tooltip template:', e);
    return () => null;
  }

  return (info: PickingInfo) => {
    if (!info.object) {
      return null;
    }

    const feature = getFeatureFromDatum(info.object);
    const props = feature?.properties;
    if (!props) {
      return null;
    }

    try {
      const html = liquid.renderSync(parsed, buildScope(props)).trim();
      return html ? { html } : null;
    } catch {
      return null;
    }
  };
}
