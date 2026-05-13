jest.mock('./_all', () => ({
  layerDefinitions: [
    {
      type: 'scatterplot',
      label: 'Scatter Plot',
      createDefaultConfig: jest.fn(),
      editorSections: [],
      renderLayers: jest.fn(() => []),
    },
  ],
}));

jest.mock('./extensions/_all', () => ({
  layerExtensionDefinitions: [
    { id: 'blending', createDefaults: jest.fn(), editorSections: [], apply: jest.fn((layer) => layer) },
    { id: 'collision', createDefaults: jest.fn(), editorSections: [], apply: jest.fn((layer) => layer) },
    { id: 'material', createDefaults: jest.fn(), editorSections: [], apply: jest.fn((layer) => layer) },
  ],
}));

import { getAllLayerExtensions, getAllLayerTypes, getLayer } from './registry';

describe('layer registry', () => {
  it('exposes built-in layer definitions through a pure catalog', () => {
    expect(getAllLayerTypes().length).toBeGreaterThan(0);
    expect(getLayer('scatterplot')?.type).toBe('scatterplot');
  });

  it('exposes shared extension definitions through a pure catalog', () => {
    const extensionIds = getAllLayerExtensions().map((extension) => extension.id);
    expect(extensionIds).toEqual(expect.arrayContaining(['blending', 'collision', 'material']));
  });
});
