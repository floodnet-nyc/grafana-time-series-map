import React, { useMemo, useState } from 'react';
import type { LayerConfig, ColorScaleConfig, ColorStep } from '../types';
import { schemeToGradientCss } from '../utils/deckgl/colorSchemes';

// ── Helpers ───────────────────────────────────────────────────────────────────

function swatchHex([r, g, b]: [number, number, number, number]): string {
  const h = (n: number) => Math.round(Math.max(0, Math.min(255, n))).toString(16).padStart(2, '0');
  return `#${h(r)}${h(g)}${h(b)}`;
}

function formatValue(v: number): string {
  return Number.isInteger(v) ? String(v) : v.toFixed(1);
}

// ── Sub-components ────────────────────────────────────────────────────────────

function ThresholdLegend({ steps }: { steps: ColorStep[] }) {
  const sorted = useMemo(() => [...steps].sort((a, b) => a.value - b.value), [steps]);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {sorted.map((step, i) => {
        const next = sorted[i + 1];
        const label = next != null
          ? `${formatValue(step.value)} – ${formatValue(next.value)}`
          : `≥ ${formatValue(step.value)}`;
        return (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <div style={{
              width: 12,
              height: 12,
              borderRadius: 2,
              backgroundColor: swatchHex(step.color),
              flexShrink: 0,
              boxShadow: '0 0 0 1px rgba(255,255,255,0.12)',
            }} />
            <span style={{ fontSize: 11, color: '#bbb', lineHeight: 1.2 }}>{label}</span>
          </div>
        );
      })}
    </div>
  );
}

function GradientLegend({ colorScale }: { colorScale: ColorScaleConfig }) {
  const gradient = useMemo(
    () => schemeToGradientCss(colorScale.schemeName ?? '', colorScale.invert ?? false),
    [colorScale.schemeName, colorScale.invert],
  );
  const min = colorScale.scaleMin ?? 0;
  const max = colorScale.scaleMax ?? 1;
  return (
    <div>
      <div style={{ height: 10, borderRadius: 3, background: gradient }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 3 }}>
        <span style={{ fontSize: 10, color: '#999' }}>{formatValue(min)}</span>
        <span style={{ fontSize: 10, color: '#999' }}>{formatValue(max)}</span>
      </div>
    </div>
  );
}

// Eye / eye-slash inline SVG icons — no icon library dependency needed.
function EyeIcon({ visible }: { visible: boolean }) {
  return visible ? (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ) : (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

function InfoIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="8" strokeWidth="3" strokeLinecap="round" />
      <line x1="12" y1="12" x2="12" y2="16" />
    </svg>
  );
}

function LayerLegendEntry({
  layer,
  onToggle,
  showEye,
}: {
  layer: LayerConfig;
  onToggle?: () => void;
  showEye: boolean;
}) {
  const cs = layer.colorScale;
  const visible = layer.visible;
  const [tooltipVisible, setTooltipVisible] = React.useState(false);

  return (
    <div style={{ marginBottom: 10, opacity: visible ? 1 : 0.45, transition: 'opacity 0.15s' }}>
      {/* Title row — clickable to toggle */}
      <div
        onClick={onToggle}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 6,
          marginBottom: 5,
          cursor: onToggle ? 'pointer' : 'default',
          userSelect: 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
          {cs?.type === 'fixed' && cs.fixedColor && (
            <span style={{
              display: 'inline-block',
              width: 10,
              height: 10,
              borderRadius: 2,
              backgroundColor: swatchHex(cs.fixedColor),
              flexShrink: 0,
              boxShadow: '0 0 0 1px rgba(255,255,255,0.12)',
            }} />
          )}
          <span style={{
            fontSize: 11,
            fontWeight: 600,
            color: '#e0e0e0',
            lineHeight: 1.2,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {layer.label}
          </span>
          {layer.description && (
            <span
              onClick={(e) => e.stopPropagation()}
              onMouseEnter={() => setTooltipVisible(true)}
              onMouseLeave={() => setTooltipVisible(false)}
              style={{ position: 'relative', color: '#666', flexShrink: 0, lineHeight: 0, cursor: 'default' }}
            >
              <InfoIcon />
              {tooltipVisible && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  marginTop: 4,
                  background: 'rgba(20, 22, 34, 0.96)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  borderRadius: 5,
                  padding: '5px 8px',
                  minWidth: 120,
                  maxWidth: 200,
                  fontSize: 11,
                  color: '#ccc',
                  lineHeight: 1.4,
                  whiteSpace: 'normal',
                  zIndex: 200,
                  boxShadow: '0 2px 10px rgba(0,0,0,0.6)',
                  pointerEvents: 'none',
                }}>
                  {layer.description}
                </div>
              )}
            </span>
          )}
        </div>
        {onToggle && showEye && (
          <span style={{ color: visible ? '#888' : '#555', flexShrink: 0, lineHeight: 0 }}>
            <EyeIcon visible={visible} />
          </span>
        )}
      </div>

      {/* Color key — only rendered when layer is visible */}
      {visible && cs?.type === 'threshold' && cs.steps && cs.steps.length > 0 && (
        <ThresholdLegend steps={cs.steps} />
      )}
      {visible && cs?.type === 'gradient' && cs.schemeName && (
        <GradientLegend colorScale={cs} />
      )}
    </div>
  );
}

// ── Public component ──────────────────────────────────────────────────────────

function hasLegendContent(cs: ColorScaleConfig | undefined): boolean {
  if (!cs) { return false; }
  if (cs.type === 'fixed') { return !!cs.fixedColor; }
  if (cs.type === 'threshold') { return (cs.steps?.length ?? 0) > 0; }
  return !!cs.schemeName;
}

// Chevron icons for collapse/expand
function ChevronIcon({ direction }: { direction: 'up' | 'down' | 'left' | 'right' }) {
  const rotate = { up: 180, down: 0, left: 90, right: -90 }[direction];
  return (
    <svg
      width="12" height="12" viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="2.5"
      strokeLinecap="round" strokeLinejoin="round"
      style={{ transform: `rotate(${rotate}deg)`, display: 'block' }}
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

interface MapLegendProps {
  layers: LayerConfig[];
  onToggleVisibility?: (layerId: string) => void;
  panelWidth?: number;
  showEye?: boolean; // Whether to show the eye icon for visibility toggle (default: false)
}

const SMALL_PANEL_THRESHOLD = 400;

export function MapLegend({ layers, onToggleVisibility, panelWidth = 500, showEye=false }: MapLegendProps) {
  const [collapsed, setCollapsed] = useState(() => panelWidth < SMALL_PANEL_THRESHOLD);

  // Show all legend-worthy layers regardless of visibility so hidden ones can be re-enabled.
  const entries = useMemo(
    () => layers.filter((l) => (l.showInLegend ?? true) && hasLegendContent(l.colorScale)),
    [layers],
  );

  if (entries.length === 0) { return null; }

  const boxStyle: React.CSSProperties = {
    position: 'absolute',
    top: 16,
    left: 12,
    background: 'rgba(14, 16, 25, 0.63)',//rgba(16, 21, 46, 0.56)
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 8,
    zIndex: 100,
    backdropFilter: 'blur(6px)',
    boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
  };

  if (collapsed) {
    return (
      <div style={{ ...boxStyle, padding: '5px 8px' }}>
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
    <div style={{ ...boxStyle, padding: '10px 14px 8px' }}>
      {entries.map((layer) => (
        <LayerLegendEntry
          key={layer.id}
          layer={layer}
          showEye={showEye}
          onToggle={onToggleVisibility ? () => onToggleVisibility(layer.id) : undefined}
        />
      ))}
      {/* Collapse button */}
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
            // color: '#666',
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
