import React from 'react';
import { buildLiquidScope, renderLiquidTemplate } from '../utils/liquid';
import type { PopupSelectionContext } from '../utils/popupSelection';

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
  selectionContext: PopupSelectionContext | null;
  template: string;
  onClose: () => void;
  inline?: boolean;
  fromTimeMs?: number;
  toTimeMs?: number;
  currentTimeMs?: number;
}

export function SensorPopup({
  selectedKey,
  selectionContext,
  template,
  onClose,
  inline = false,
  fromTimeMs,
  toTimeMs,
  currentTimeMs,
}: SensorPopupProps) {
  const primary = selectionContext?.primary ?? null;
  const scope = {
    ...buildLiquidScope(primary?.properties ?? {}, selectedKey),
    ...(primary?.scope ?? {}),
    _key: selectedKey,
    from: fromTimeMs,
    to: toTimeMs,
    currentTime: currentTimeMs,
    primary,
    match: selectionContext?.match ?? {},
    matches: selectionContext?.matches ?? {},
    flatMatches: selectionContext?.flatMatches ?? [],
  };
  const html = renderLiquidTemplate(template, scope);

  return (
    <div
      style={{
        position: inline ? 'relative' : 'absolute',
        top: inline ? undefined : 12,
        right: inline ? undefined : 12,
        padding: '12px 16px 14px',
        color: '#e8e8e8',
        minWidth: 180,
        maxWidth: 320,
        zIndex: 100,
        fontFamily: 'inherit',
      }}
      className="map-card"
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
