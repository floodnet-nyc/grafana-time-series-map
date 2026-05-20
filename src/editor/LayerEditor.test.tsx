import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import type { LayerConfig } from '../layers';
import { createSourceRef } from '../layers/defaults';
import type { ScatterplotLayerConfig } from '../layers/scatterplot';
import { LayerEditor } from './LayerEditor';

jest.mock('../layers', () => ({
  layerDefinitions: [
    {
      type: 'scatterplot',
      label: 'Scatter Plot',
      createDefaultConfig: () => ({
        id: 'scatter-1',
        type: 'scatterplot',
        label: 'Scatter Plot 1',
        visible: true,
        data: { featureSource: { id: 'main', refId: '' } },
        settings: {
          radiusMinPixels: 4,
          radiusMaxPixels: 20,
          radiusScale: 1,
          radius: createSourceRef(),
          elevation: createSourceRef(),
          elevationScale: 1,
          depthTest: false,
          stroked: true,
          showLabels: false,
          label: createSourceRef(),
        },
        geometry: { type: 'none' },
        timeFilter: { mode: 'none', time: createSourceRef('time') },
            opacity: 1,
      }),
      editorSections: [{ title: 'Point', fields: [{ key: 'radiusMinPixels', label: 'Min radius (px)', type: 'number', defaultValue: 4 }] }],
      renderLayers: jest.fn(() => []),
    },
    {
      type: 'path',
      label: 'Path',
      createDefaultConfig: () => ({
        id: 'path-1',
        type: 'path',
        label: 'Path 1',
        visible: true,
        data: { featureSource: { id: 'main', refId: '' } },
        settings: {
          widthMinPixels: 2,
          widthMaxPixels: 10,
          width: createSourceRef(),
          widthScale: 1,
          capRounded: true,
          jointRounded: true,
        },
        geometry: { type: 'none' },
        timeFilter: { mode: 'none', time: createSourceRef('time') },
            opacity: 1,
      }),
      editorSections: [{ title: 'Path', fields: [{ key: 'widthMinPixels', label: 'Min width (px)', type: 'number', defaultValue: 2 }] }],
      renderLayers: jest.fn(() => []),
    },
  ],
}));

jest.mock('../extensions', () => ({
  layerExtensionDefinitions: [],
}));

jest.mock('@grafana/ui', () => {
  const React = require('react');
  return {
    useStyles2: (getStyles: (theme: any) => any) =>
      getStyles({
        spacing: () => '0px',
        shape: { radius: { default: 0 } },
        colors: {
          background: { secondary: '#222' },
          action: { hover: '#333', selected: '#444' },
          text: { secondary: '#666', primary: '#000' },
          border: { weak: '#ccc', medium: '#ccc', strong: '#999' },
          error: { text: '#f00' },
        },
      }),
    Field: ({ label, children }: { label: string; children: React.ReactNode }) => <label><span>{label}</span>{children}</label>,
    Input: ({ value, onChange, type = 'text' }: any) => <input type={type} value={value} onChange={onChange} />,
    Switch: ({ value, onChange }: any) => <input type="checkbox" checked={value} onChange={onChange} />,
    Combobox: ({ options = [], value, onChange }: any) => (
      <select value={value ?? ''} onChange={(event) => onChange({ value: event.currentTarget.value })}>
        {options.map((option: any, index: number) => <option key={`${String(option.value)}-${index}`} value={option.value}>{option.label}</option>)}
      </select>
    ),
    Slider: ({ value, onChange, min = 0, max = 100, step = 1, inputId }: any) => (
      <input aria-label={inputId} type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.currentTarget.value))} />
    ),
    TextArea: ({ value, onChange }: any) => <textarea value={value} onChange={onChange} />,
    CollapsableSection: ({ label, children }: { label: string; children: React.ReactNode }) => <section><h2>{label}</h2>{children}</section>,
    ColorPicker: ({ color, onChange }: any) => <input value={color} onChange={(e) => onChange(e.currentTarget.value)} />,
    Button: ({ children, onClick }: any) => <button onClick={onClick}>{children}</button>,
    IconButton: ({ onClick, tooltip, name }: any) => (
      <button onClick={onClick} aria-label={tooltip ?? name}>
        {name}
      </button>
    ),
  };
});

function createLayer(overrides: Partial<LayerConfig> = {}): LayerConfig {
  const base: ScatterplotLayerConfig = {
    id: 'layer-1',
    type: 'scatterplot',
    label: 'Layer 1',
    visible: true,
    data: { featureSource: { id: 'main', refId: '' } },
    settings: {
      radiusMinPixels: 7,
      radiusMaxPixels: 20,
      radiusScale: 1,
      radius: createSourceRef(),
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
    extensions: [
      {
        id: 'blending-1',
        type: 'blending',
        config: {
          enabled: true,
          blend: true,
          colorOperation: 'add',
          colorSrcFactor: 'src-alpha',
          colorDstFactor: 'one-minus-src-alpha',
          alphaOperation: 'add',
          alphaSrcFactor: 'one',
          alphaDstFactor: 'one-minus-src-alpha',
        },
      },
    ],
  };
  return { ...base, ...overrides } as LayerConfig;
}

function Harness({ initialLayer }: { initialLayer?: LayerConfig }) {
  const [layer, setLayer] = React.useState(initialLayer ?? createLayer());
  return (
    <div>
      <LayerEditor
        layer={layer}
        onChange={setLayer}
        availableRefIds={['A', 'B']}
        queryFieldsByRefId={{ A: ['deployment_id', 'time', 'depth_inches'], B: ['sensor_id', 'time', 'status'] }}
        sourceOptions={[{ id: 'main', label: 'Feature source' }]}
        fieldsBySource={{ main: ['depth', 'sensor_id'] }}
        featureSourceOptions={[{ id: 'main', label: 'Feature source' }]}
        featureFieldsBySource={{ main: ['deployment_id', 'time', 'depth_inches'] }}
      />
      <pre data-testid="layer-state">{JSON.stringify(layer)}</pre>
    </div>
  );
}

function currentLayer(): LayerConfig {
  return JSON.parse(screen.getByTestId('layer-state').textContent ?? '{}') as LayerConfig;
}

describe('LayerEditor interactions', () => {
  it('updates feature source refId through the combobox', () => {
    render(<Harness />);
    fireEvent.click(screen.getByText('Feature source'));
    const queryField = screen.getByText('Query').closest('label')?.querySelector('select');
    expect(queryField).not.toBeNull();
    fireEvent.change(queryField as HTMLSelectElement, { target: { value: 'B' } });
    expect(currentLayer().data.featureSource.refId).toBe('B');
  });

  it('switches layer type and resets settings to that definition', () => {
    render(<Harness />);
    const selects = screen.getAllByRole('combobox');
    fireEvent.change(selects[0], { target: { value: 'path' } });
    expect(currentLayer().type).toBe('path');
    expect((currentLayer() as any).settings.widthMinPixels).toBe(2);
    expect(currentLayer().extensions?.[0]?.config?.enabled).toBe(true);
  });

  it('creates threshold and gradient color payloads when changing color modes', () => {
    render(<Harness />);
    const colorMode = screen.getAllByRole('combobox').find((element) => element.textContent?.includes('Fixed color'));
    expect(colorMode).toBeDefined();
    fireEvent.change(colorMode!, { target: { value: 'threshold' } });
    expect(currentLayer().colorScale?.type).toBe('threshold');
    fireEvent.change(colorMode!, { target: { value: 'gradient' } });
    expect(currentLayer().colorScale).toMatchObject({ type: 'gradient', schemeName: 'FloodDepth' });
  });
});
