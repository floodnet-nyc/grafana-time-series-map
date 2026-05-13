import React from 'react';
import type { Feature } from 'geojson';
import { buildLiquidScope, renderLiquidTemplate } from '../utils/liquid';
import { mapCardStyle } from './mapCard';

export const DEFAULT_POPUP_TEMPLATE = [
  '<div style="font-weight:700;font-size:14px;margin-bottom:10px">{{ _key }}</div>',
  '<table style="border-collapse:collapse;font-size:12px;line-height:1.5">',
  '  {%- for p in properties -%}',
  '  <tr>',
  '    <td style="padding:2px 10px 2px 0;opacity:.7;white-space:nowrap">{{ p.key }}</td>',
  '    <td style="padding:2px 0">{{ p.value }}</td>',
  '  </tr>',
  '  {%- endfor -%}',
  '</table>',
].join('\n');

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
          top: 6,
          right: 10,
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
