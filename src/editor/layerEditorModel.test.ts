import type { LayerConfig } from '../layers/_all';
import type { ScatterplotLayerConfig } from '../layers/scatterplot';
import {
  appendThresholdStep,
  createColorModePatch,
  getActiveScheme,
  getColorMode,
  groupOptionsBySection,
  patchThresholdStep,
  removeThresholdStep,
  splitOptionSections,
} from './layerEditorModel';

function createLayer(overrides: Partial<LayerConfig> = {}): LayerConfig {
  const base: ScatterplotLayerConfig = {
    id: 'layer-1',
    type: 'scatterplot',
    label: 'Layer',
    visible: true,
    settings: {
      radiusMinPixels: 4,
      radiusMaxPixels: 20,
      radiusField: '',
      radiusScale: 1,
      stroked: true,
      showLabels: false,
      labelField: '',
    },
    geometry: { type: 'none' },
    timeFilter: { mode: 'none', timeField: '' },
    fieldMappings: [],
    opacity: 1,
  };
  return { ...base, ...overrides } as LayerConfig;
}

describe('layerEditorModel', () => {
  it('groups and splits option sections', () => {
    const grouped = groupOptionsBySection([
      { key: 'a', label: 'A', type: 'boolean', section: 'General' },
      { key: 'b', label: 'B', type: 'boolean', section: 'Blending' },
      { key: 'c', label: 'C', type: 'boolean' },
    ]);

    const sections = splitOptionSections(grouped);

    expect(sections.regular).toHaveLength(2);
    expect(sections.advancedColor).toHaveLength(1);
  });

  it('derives color mode and active scheme', () => {
    expect(getColorMode(createLayer())).toBe('fixed');
    expect(getColorMode(createLayer({ colorScale: { type: 'threshold', field: 'depth', steps: [] } }))).toBe('threshold');
    expect(getColorMode(createLayer({ colorScale: { type: 'gradient', field: 'depth', schemeName: 'FloodDepth' } }))).toBe('gradient');
    expect(getActiveScheme(createLayer({ colorScale: { type: 'gradient', schemeName: 'FloodDepth' } }))).toBe('FloodDepth');
  });

  it('creates mode patches for fixed, threshold, and gradient color modes', () => {
    expect(createColorModePatch('fixed', createLayer(), 'glsl')).toMatchObject({
      colorScale: { type: 'fixed' },
    });

    expect(createColorModePatch('threshold', createLayer({ colorScale: { type: 'fixed', field: 'depth' } as any }), 'glsl'))
      .toMatchObject({
        colorScale: { type: 'threshold', field: 'depth' },
        shader: { enabled: true, vsFilterColor: 'glsl' },
      });

    expect(createColorModePatch('gradient', createLayer({ colorScale: { type: 'fixed', field: 'depth' } as any }), 'glsl'))
      .toMatchObject({
        colorScale: { type: 'gradient', field: 'depth', schemeName: 'FloodDepth' },
        shader: { enabled: true, vsFilterColor: 'glsl' },
      });
  });

  it('updates threshold step collections predictably', () => {
    const steps = [
      { value: 1, color: [1, 1, 1, 255] as [number, number, number, number] },
      { value: 2, color: [2, 2, 2, 255] as [number, number, number, number] },
    ];

    expect(patchThresholdStep(steps, 1, { value: 9 })[1].value).toBe(9);
    expect(removeThresholdStep(steps, 0)).toHaveLength(1);
    expect(appendThresholdStep(steps)[2].value).toBe(12);
  });
});
