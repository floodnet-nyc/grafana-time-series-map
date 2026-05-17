import type { PickingInfo } from '@deck.gl/core';
import type { DeckTooltipContent } from '../../components/map/types';
import { liquid, getFeatureFromDatum, buildLiquidScope } from '../liquid';
import { mapCardTooltipStyle } from '../../components/mapCard';

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

export const DEFAULT_TOOLTIP_TEMPLATE = `\
<table class="fn-datatable">
  {%- for p in properties -%}
  <tr>
    <td>{{ p.key }}</td>
    <td>{{ p.value | pretty }}</td>
  </tr>
  {%- endfor -%}
</table>
`;

export function buildDeckTooltip(template: string): (info: PickingInfo) => DeckTooltipContent {
  let parsed: ReturnType<typeof liquid.parse>;
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
      const html = liquid.renderSync(parsed, buildLiquidScope(props)).trim();
      return html ? { html, style: mapCardTooltipStyle } : null;
    } catch {
      return null;
    }
  };
}
