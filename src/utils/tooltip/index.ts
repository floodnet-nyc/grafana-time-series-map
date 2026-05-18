import type { PickingInfo } from '@deck.gl/core';
import type { DeckTooltipContent } from '../../components/map/types';
import { liquid, getFeatureFromDatum, buildLiquidScope } from '../liquid';

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
      return html ? { html, className: 'map-card-tooltip' } : null;
    } catch {
      return null;
    }
  };
}
