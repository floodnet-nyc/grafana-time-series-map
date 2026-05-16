import React from 'react';
import type { Feature } from 'geojson';
import { buildLiquidScope, renderLiquidTemplate } from '../utils/liquid';
import { mapCardStyle } from './mapCard';


export const DEFAULT_POPUP_TEMPLATE = `\
<table class="fn-datatable">
  {%- for p in properties -%}
  <tr>
    <td>{{ p.key }}</td>
    <td>{{ p.value | pretty }}</td>
  </tr>
  {%- endfor -%}
</table>
`;

interface SensorPopupProps {
  selectedKey: string;
  feature: Feature | null;
  template: string;
  onClose: () => void;
}

export function SensorPopup({ selectedKey, feature, template, onClose }: SensorPopupProps) {
  const scope = buildLiquidScope(feature?.properties ?? {}, selectedKey);
  const html = renderLiquidTemplate(template, scope);

  return (
    <div
      style={{
        ...mapCardStyle,
        position: 'absolute',
        top: 12,
        right: 12,
        padding: '12px 16px 14px',
        color: '#e8e8e8',
        minWidth: 180,
        maxWidth: 320,
        zIndex: 100,
        fontFamily: 'inherit',
      }}
    >
      <button
        style={{
          position: 'absolute',
          top: 4,
          right: 6,
          background: 'none',
          border: 'none',
          color: '#888',
          cursor: 'pointer',
          fontSize: 18,
          lineHeight: 1,
          padding: 0,
        }}
        onClick={onClose}
        aria-label="Close"
      >
        ×
      </button>
      {html ? (
        <div dangerouslySetInnerHTML={{ __html: html }} />
      ) : (
        <div style={{ opacity: 0.5, fontSize: 12 }}>{selectedKey}</div>
      )}
    </div>
  );
}
