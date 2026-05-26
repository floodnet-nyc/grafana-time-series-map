import React, { useMemo } from 'react';
import type { ColorScaleConfig } from '../../../types';
import { schemeToGradientCss } from '../../../utils/deckgl/colorSchemes';
import { formatValue } from '../utils';

export function GradientLegend({ colorScale }: { colorScale: ColorScaleConfig }) {
  const gradient = useMemo(
    () => schemeToGradientCss(colorScale.schemeName ?? '', colorScale.invert ?? false),
    [colorScale.invert, colorScale.schemeName]
  );

  const min = colorScale.scaleMin ?? 0;
  const max = colorScale.scaleMax ?? 1;

  return (
    <div>
      <div style={{ height: 8, borderRadius: 10, background: gradient }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 3 }}>
        <span style={{ fontSize: 10, color: '#999' }}>{formatValue(min)}</span>
        <span style={{ fontSize: 10, color: '#999' }}>{formatValue(max)}</span>
      </div>
    </div>
  );
}
