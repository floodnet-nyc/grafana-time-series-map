import type { LayerConfig } from '../../layers';
import { createSourceRef } from '../../layers/defaults';
import type { ScatterplotLayerConfig } from '../../layers/scatterplot';
import { formatValue, getLegendEntries, hasLegendContent, sortThresholdSteps, swatchHex } from './utils';

function createLayer(overrides: Partial<LayerConfig> = {}): LayerConfig {
  const base: ScatterplotLayerConfig = {
    id: 'layer-1',
    type: 'scatterplot',
    label: 'Layer 1',
    visible: true,
    settings: {
      radiusMinPixels: 4,
      radiusMaxPixels: 20,
      radius: createSourceRef(),
      radiusScale: 1,
      elevation: createSourceRef(),
      elevationScale: 1,
      depthTest: false,
      stroked: true,
      showLabels: false,
      label: createSourceRef(),
    },
    geometry: { type: 'none' },
    timeFilter: { mode: 'none', time: createSourceRef() },
    opacity: 1,
    data: { featureSource: { id: 'main', refId: '' } },
  };
  return { ...base, ...overrides } as LayerConfig;
}

describe('map legend helpers', () => {
  it('detects whether a color scale has legend content', () => {
    expect(hasLegendContent(undefined)).toBe(false);
    expect(hasLegendContent({ type: 'fixed' })).toBe(false);
    expect(hasLegendContent({ type: 'fixed', fixedColor: [10, 20, 30, 255] })).toBe(true);
    expect(hasLegendContent({ type: 'threshold', steps: [] })).toBe(false);
    expect(hasLegendContent({ type: 'threshold', steps: [{ value: 2, color: [1, 2, 3, 255] }] })).toBe(true);
    expect(hasLegendContent({ type: 'gradient' })).toBe(false);
    expect(hasLegendContent({ type: 'gradient', schemeName: 'viridis' })).toBe(true);
  });

  it('filters to legend-worthy layers only', () => {
    const entries = getLegendEntries([
      createLayer({ id: 'visible-fixed', colorScale: { type: 'fixed', fixedColor: [0, 0, 0, 255] } }),
      createLayer({ id: 'hidden-legend', showInLegend: false, colorScale: { type: 'fixed', fixedColor: [0, 0, 0, 255] } }),
      createLayer({ id: 'no-content', colorScale: { type: 'gradient' } }),
    ]);

    expect(entries.map((entry) => entry.id)).toEqual(['visible-fixed']);
  });

  it('sorts threshold steps in ascending order', () => {
    const sorted = sortThresholdSteps([
      { value: 10, color: [0, 0, 0, 255] },
      { value: 2, color: [0, 0, 0, 255] },
      { value: 4, color: [0, 0, 0, 255] },
    ]);

    expect(sorted.map((step) => step.value)).toEqual([2, 4, 10]);
  });

  it('formats swatch colors and labels consistently', () => {
    expect(swatchHex([15, 31, 255, 128])).toBe('#0f1fff');
    expect(formatValue(5)).toBe('5');
    expect(formatValue(5.25)).toBe('5.3');
  });
});
