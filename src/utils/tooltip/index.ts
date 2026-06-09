import type { PickingInfo } from '@deck.gl/core';
import type { DeckTooltipContent } from '../../components/map/types';
import { buildFeatureAt, type LayerDatum } from '../dataframe/layerTable';
import { liquid, getFeatureFromDatum, buildLiquidScope } from '../liquid';
import type { LayerWithConfig } from '../../layers/types';

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

    const feature =
      getFeatureFromDatum(info.object) ??
      (() => {
        const datum = info.object as LayerDatum | undefined;
        const table = (info.layer as LayerWithConfig | undefined)?.props?.table;
        return table && typeof datum?.__idx === 'number' ? buildFeatureAt(table, datum.__idx) : null;
      })();
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
