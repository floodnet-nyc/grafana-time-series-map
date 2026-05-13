import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import type { LayerConfig, ScatterplotLayerConfig } from '../layers/types';
import { LayerEditor } from './LayerEditor';

jest.mock('./HtmlCodeEditor', () => ({
  HtmlCodeEditor: ({ value, onChange }: { value: string; onChange: (value: string) => void }) => (
    <textarea value={value} onChange={(event) => onChange(event.currentTarget.value)} />
  ),
}));

jest.mock('../layers/_all', () => ({
  layerDefinitions: [
    {
      type: 'scatterplot',
      label: 'Scatter Plot',
      createDefaultConfig: () => ({
        id: 'scatter-1',
        type: 'scatterplot',
        label: 'Scatter Plot 1',
        visible: true,
        settings: {
          radiusMinPixels: 4,
          radiusMaxPixels: 20,
          radiusScale: 1,
          radiusField: '',
          stroked: true,
          showLabels: false,
          labelField: '',
        },
        geometry: { type: 'none' },
        timeFilter: { mode: 'none', timeField: 'time' },
        fieldMappings: [],
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
        settings: {
          widthMinPixels: 2,
          widthMaxPixels: 10,
          widthField: '',
          widthScale: 1,
          capRounded: true,
          jointRounded: true,
        },
        geometry: { type: 'none' },
        timeFilter: { mode: 'none', timeField: 'time' },
        fieldMappings: [],
        opacity: 1,
      }),
      editorSections: [{ title: 'Path', fields: [{ key: 'widthMinPixels', label: 'Min width (px)', type: 'number', defaultValue: 2 }] }],
      renderLayers: jest.fn(() => []),
    },
  ],
}));

jest.mock('../layers/extensions', () => ({
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
  };
});

function createLayer(overrides: Partial<LayerConfig> = {}): LayerConfig {
  const base: ScatterplotLayerConfig = {
    id: 'layer-1',
    type: 'scatterplot',
    label: 'Layer 1',
    visible: true,
    settings: {
      radiusMinPixels: 7,
      radiusMaxPixels: 20,
      radiusScale: 1,
      radiusField: '',
      stroked: true,
      showLabels: false,
      labelField: '',
    },
    geometry: { type: 'none' },
    timeFilter: { mode: 'none', timeField: '' },
    fieldMappings: [],
    opacity: 1,
    extensions: {
      blending: {
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
        availableFields={['depth', 'sensor_id']}
        availableRefIds={['A', 'B']}
        queryFieldsByRefId={{ A: ['deployment_id', 'time', 'depth_inches'], B: ['sensor_id', 'time', 'status'] }}
      />
      <pre data-testid="layer-state">{JSON.stringify(layer)}</pre>
    </div>
  );
}

function currentLayer(): LayerConfig {
  return JSON.parse(screen.getByTestId('layer-state').textContent ?? '{}') as LayerConfig;
}

describe('LayerEditor interactions', () => {
  it('updates query refId through the combobox', () => {
    render(<Harness />);
    const selects = screen.getAllByRole('combobox');
    fireEvent.change(selects[1], { target: { value: 'B' } });
    expect(currentLayer().queryRefId).toBe('B');
  });

  it('switches layer type and resets settings to that definition', () => {
    render(<Harness />);
    const selects = screen.getAllByRole('combobox');
    fireEvent.change(selects[0], { target: { value: 'path' } });
    expect(currentLayer().type).toBe('path');
    expect((currentLayer() as any).settings.widthMinPixels).toBe(2);
    expect(currentLayer().extensions?.blending?.enabled).toBe(true);
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
