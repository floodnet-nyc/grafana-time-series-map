import type { LayerConfig } from '../../layers';
import { createSourceRef } from '../../layers/defaults';
import type { IconLayerConfig } from '../../layers/icon';
import type { ScatterplotLayerConfig } from '../../layers/scatterplot';
import { formatValue, getLegendEntries, getLegendIconDefinition, hasColorLegendContent, hasLegendContent, sortThresholdSteps, swatchHex } from './utils';

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

function createIconLayer(overrides: Partial<LayerConfig> = {}): LayerConfig {
  const base: IconLayerConfig = {
    id: 'icon-1',
    type: 'icon',
    label: 'Icon 1',
    visible: true,
    settings: {
      fixedIcon: 'marker',
      icon: createSourceRef(),
      iconAtlasUrl: '',
      iconMappingUrl: '',
      fixedRotation: 0,
      rotation: createSourceRef(),
      elevation: createSourceRef(),
      elevationScale: 1,
      depthTest: false,
      sizeScale: 16,
      sizeMinPixels: 8,
      sizeMaxPixels: 64,
      size: createSourceRef(),
      billboard: true,
      alphaCutoff: 0.05,
    },
    geometry: { type: 'none' },
    timeFilter: { mode: 'none', time: createSourceRef() },
    opacity: 1,
    data: { featureSource: { id: 'main', refId: '' } },
    extensions: [],
  };
  return { ...base, ...overrides } as LayerConfig;
}

describe('map legend helpers', () => {
  it('detects whether a color scale has legend content', () => {
    expect(hasColorLegendContent(undefined)).toBe(false);
    expect(hasColorLegendContent({ type: 'fixed' })).toBe(false);
    expect(hasColorLegendContent({ type: 'fixed', fixedColor: [10, 20, 30, 255] })).toBe(true);
    expect(hasColorLegendContent({ type: 'threshold', steps: [] })).toBe(false);
    expect(hasColorLegendContent({ type: 'threshold', steps: [{ value: 2, color: [1, 2, 3, 255] }] })).toBe(true);
    expect(hasColorLegendContent({ type: 'gradient' })).toBe(false);
    expect(hasColorLegendContent({ type: 'gradient', schemeName: 'viridis' })).toBe(true);
  });

  it('treats icon layers as legend-worthy when they have a representative icon', () => {
    const iconLayer = createIconLayer();

    expect(getLegendIconDefinition(iconLayer)).toBeDefined();
    expect(hasLegendContent(iconLayer)).toBe(true);
  });

  it('filters to legend-worthy layers only', () => {
    const entries = getLegendEntries([
      createLayer({ id: 'visible-fixed', colorScale: { type: 'fixed', fixedColor: [0, 0, 0, 255] } }),
      createIconLayer({ id: 'tidal-stations', colorScale: { type: 'fixed', fixedColor: [31, 96, 196, 255] } }),
      createLayer({
        id: 'hidden-legend',
        showInLegend: false,
        colorScale: { type: 'fixed', fixedColor: [0, 0, 0, 255] },
      }),
      createLayer({ id: 'no-content', colorScale: { type: 'gradient' } }),
    ]);

    expect(entries.map((entry) => entry.id)).toEqual(['visible-fixed', 'tidal-stations']);
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
