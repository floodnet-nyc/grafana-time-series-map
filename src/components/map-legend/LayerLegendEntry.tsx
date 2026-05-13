import React, { useState } from 'react';
import type { LayerConfig } from '../../layers/types';
import { EyeIcon, InfoIcon } from './icons';
import { GradientLegend } from './GradientLegend';
import { ThresholdLegend } from './ThresholdLegend';
import { swatchHex } from './helpers';
import { tooltipStyle } from './styles';

interface LayerLegendEntryProps {
  layer: LayerConfig;
  onToggle?: () => void;
  showEye: boolean;
}

export function LayerLegendEntry({ layer, onToggle, showEye }: LayerLegendEntryProps) {
  const colorScale = layer.colorScale;
  const [tooltipVisible, setTooltipVisible] = useState(false);

  return (
    <div style={{ marginBottom: 10, opacity: layer.visible ? 1 : 0.45, transition: 'opacity 0.15s' }}>
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
          {colorScale?.type === 'fixed' && colorScale.fixedColor && (
            <span
              style={{
                display: 'inline-block',
                width: 10,
                height: 10,
                borderRadius: 2,
                backgroundColor: swatchHex(colorScale.fixedColor),
                flexShrink: 0,
                boxShadow: '0 0 0 1px rgba(255,255,255,0.12)',
              }}
            />
          )}

          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: '#e0e0e0',
              lineHeight: 1.2,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {layer.label}
          </span>

          {layer.description && (
            <span
              onClick={(event) => event.stopPropagation()}
              onMouseEnter={() => setTooltipVisible(true)}
              onMouseLeave={() => setTooltipVisible(false)}
              style={{ position: 'relative', color: '#666', flexShrink: 0, lineHeight: 0, cursor: 'default' }}
            >
              <InfoIcon />
              {tooltipVisible && <div style={tooltipStyle}>{layer.description}</div>}
            </span>
          )}
        </div>

        {onToggle && showEye && (
          <span style={{ color: layer.visible ? '#888' : '#555', flexShrink: 0, lineHeight: 0 }}>
            <EyeIcon visible={layer.visible} />
          </span>
        )}
      </div>

      {layer.visible && colorScale?.type === 'threshold' && colorScale.steps && colorScale.steps.length > 0 && (
        <ThresholdLegend steps={colorScale.steps} />
      )}
      {layer.visible && colorScale?.type === 'gradient' && colorScale.schemeName && (
        <GradientLegend colorScale={colorScale} />
      )}
    </div>
  );
}
