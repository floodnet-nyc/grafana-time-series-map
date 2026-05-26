import React, { useMemo, useState } from 'react';
import { ChevronIcon } from './icons';
import { getLegendEntries, SMALL_PANEL_THRESHOLD } from './utils';
import { LayerLegendEntry } from './LayerLegendEntry';
import type { MapLegendProps } from './types';

export function MapLegend({
  layers,
  onToggleVisibility,
  panelWidth = 500,
  showEye = false,
  maxWidth,
  maxHeight,
}: MapLegendProps) {
  const [collapsed, setCollapsed] = useState(() => panelWidth < SMALL_PANEL_THRESHOLD);

  const entries = useMemo(() => getLegendEntries(layers), [layers]);

  const boxStyle = {
    maxWidth: maxWidth ?? undefined,
    maxHeight: maxHeight ?? undefined,
    overflowY: maxHeight ? ('auto' as const) : undefined,
  };

  if (entries.length === 0) {
    return null;
  }

  if (collapsed) {
    return (
      <div style={{ ...boxStyle, padding: '5px 8px' }} className="map-card legend-box">
        <button
          onClick={() => setCollapsed(false)}
          title="Expand legend"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            background: 'none',
            border: 'none',
            color: '#aaa',
            cursor: 'pointer',
            padding: 0,
            fontSize: 11,
            fontWeight: 600,
            lineHeight: 1,
          }}
        >
          <ChevronIcon direction="right" />
          Legend
        </button>
      </div>
    );
  }

  return (
    <div style={{ ...boxStyle, padding: '10px 14px 8px' }} className="map-card legend-box">
      {entries.map((layer) => (
        <LayerLegendEntry
          key={layer.id}
          layer={layer}
          showEye={showEye}
          onToggle={onToggleVisibility ? () => onToggleVisibility(layer.id) : undefined}
        />
      ))}

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 2 }}>
        <button
          onClick={() => setCollapsed(true)}
          title="Collapse legend"
          style={{
            position: 'absolute',
            bottom: 4,
            right: 6,
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            background: 'none',
            border: 'none',
            color: 'inherit',
            cursor: 'pointer',
            padding: '2px 0',
            fontSize: 10,
            lineHeight: 1,
          }}
        >
          <ChevronIcon direction="left" />
        </button>
      </div>
    </div>
  );
}
