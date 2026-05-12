import './extensions/_all';
import { getLayer, registerLayer, resolveLayerOptions } from './registry';
import type { LayerRenderer } from './types';

interface TestLayerOptions {
  enabled: boolean;
  size: number;
}

const testRenderer: LayerRenderer<TestLayerOptions> = {
  type: 'test-layer',
  label: 'Test Layer',
  defaultOptions: {
    enabled: true,
    size: 5,
  },
  optionsSchema: [],
  renderLayers: () => [],
};

registerLayer(testRenderer);

describe('layer registry option normalization', () => {
  it('merges renderer defaults with provided options', () => {
    expect(resolveLayerOptions('test-layer', { size: 3 })).toMatchObject({
      enabled: true,
      size: 3,
    });
  });

  it('returns provided options when the renderer type is unknown', () => {
    expect(resolveLayerOptions('missing-type', { custom: 1 })).toEqual({ custom: 1 });
  });

  it('includes extension defaults on registered renderers', () => {
    const renderer = getLayer('test-layer');

    expect(renderer).toBeDefined();
    expect(renderer?.defaultOptions).toHaveProperty('layerBlendEnabled');
  });
});
