import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import type { LayerConfig } from '../layers';
import { createSourceRef } from '../layers/defaults';
import type { ScatterplotLayerConfig } from '../layers/scatterplot';

jest.mock('@grafana/ui', () => {
  const React = require('react');

  return {
    useStyles2: () => ({}),
    Field: ({ label, description, children }: any) =>
      React.createElement(
        'label',
        {},
        label ? React.createElement('span', {}, label) : null,
        description ? React.createElement('small', {}, description) : null,
        children
      ),
    Input: ({ value, onChange, type = 'text' }: any) =>
      React.createElement('input', { value, onChange, type }),
    Switch: ({ value, onChange }: any) =>
      React.createElement('input', { type: 'checkbox', checked: value, onChange }),
    Combobox: ({ value, onChange }: any) =>
      React.createElement('input', {
        value: value ?? '',
        onChange: (e: any) => onChange?.({ value: e.currentTarget.value }),
      }),
    Select: ({ value, onChange }: any) =>
      React.createElement('input', {
        value: value?.value ?? '',
        onChange: (e: any) => onChange?.({ value: e.currentTarget.value }),
      }),
    Slider: ({ value, onChange }: any) =>
      React.createElement('input', {
        type: 'range',
        value,
        onChange: (e: any) => onChange?.(Number(e.currentTarget.value)),
      }),
    TextArea: ({ value, onChange }: any) => React.createElement('textarea', { value, onChange }),
    CollapsableSection: ({ children }: any) => React.createElement('div', {}, children),
    ColorPicker: ({ color, onChange }: any) =>
      React.createElement('input', { value: color, onChange: (e: any) => onChange?.(e.currentTarget.value) }),
    Button: ({ children, onClick }: any) => React.createElement('button', { onClick }, children),
    IconButton: ({ onClick }: any) => React.createElement('button', { onClick }),
  };
});

jest.mock('../layers', () => ({
  layerDefinitions: [
    {
      type: 'scatterplot',
      label: 'Scatterplot',
      createDefaultConfig: () => ({}),
      editorSections: [],
    },
  ],
  getLayerDefinition: () => ({
    type: 'scatterplot',
    label: 'Scatterplot',
    createDefaultConfig: () => ({}),
    editorSections: [],
  }),
}));

jest.mock('../extensions', () => ({
  layerExtensionDefinitions: [],
}));

const { LayerEditor } = require('./LayerEditor');

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
      labelCollisionPriorityScale: 1,
      labelCollisionTestScale: 1.2,
      labelElevationOffset: 6,
    },
    geometry: { type: 'none' },
    timeFilter: { mode: 'none', time: createSourceRef() },
    opacity: 1,
    data: { featureSource: { id: 'main', refId: '' } },
    extensions: [],
  };

  return { ...base, ...overrides } as LayerConfig;
}

describe('LayerEditor', () => {
  it('allows editing the layer id', () => {
    const layer = createLayer();
    const onChange = jest.fn();

    render(<LayerEditor layer={layer} onChange={onChange} />);

    fireEvent.change(screen.getByDisplayValue('layer-1'), { target: { value: 'flood-depth' } });

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'flood-depth',
        label: 'Layer 1',
      })
    );
  });
});
