import type { PickingInfo } from '@deck.gl/core';
import type { DeckTooltipContent } from '../../../components/map/types';
import { liquid, getFeatureFromDatum, buildLiquidScope } from '../../../utils/liquid';
import { mapCardTooltipStyle } from '../../../components/mapCard';

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
