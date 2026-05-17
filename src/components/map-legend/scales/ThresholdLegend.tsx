import React, { useMemo } from 'react';
import type { ColorStep } from '../../../types';
import { formatValue, sortThresholdSteps, swatchHex } from '../utils';

export function ThresholdLegend({ steps }: { steps: ColorStep[] }) {
  const sorted = useMemo(() => sortThresholdSteps(steps), [steps]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {sorted.map((step, index) => {
        const next = sorted[index + 1];
        const label = next ? `${formatValue(step.value)} – ${formatValue(next.value)}` : `≥ ${formatValue(step.value)}`;

        return (
          <div key={index} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <div
              style={{
                width: 12,
                height: 12,
                borderRadius: 2,
                backgroundColor: swatchHex(step.color),
                flexShrink: 0,
                boxShadow: '0 0 0 1px rgba(255,255,255,0.12)',
              }}
            />
            <span style={{ fontSize: 11, color: '#bbb', lineHeight: 1.2 }}>{label}</span>
          </div>
        );
      })}
    </div>
  );
}
