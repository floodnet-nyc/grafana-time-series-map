import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import type { LayerConfig } from '../types';
import { LayerEditor } from './LayerEditor';

jest.mock('@grafana/ui', () => {
  const React = require('react');

  return {
    useStyles2: (getStyles: (theme: any) => any) =>
      getStyles({
        spacing: () => '0px',
        shape: { radius: { default: 0 } },
        colors: {
          text: { secondary: '#666', primary: '#000' },
          border: { medium: '#ccc', strong: '#999' },
          error: { text: '#f00' },
        },
      }),
    Field: ({ label, children }: { label: string; children: React.ReactNode }) => (
      <label>
        <span>{label}</span>
        {children}
      </label>
    ),
    Input: ({ value, onChange, type = 'text', placeholder }: any) => (
      <input aria-label={placeholder ?? undefined} type={type} value={value} onChange={onChange} />
    ),
    Switch: ({ value, onChange }: any) => <input type="checkbox" checked={value} onChange={onChange} />,
    Combobox: ({ options = [], value, onChange, placeholder }: any) => (
      <select
        aria-label={placeholder ?? undefined}
        value={value ?? ''}
        onChange={(event) => onChange({ value: event.currentTarget.value })}
      >
        {options.map((option: any) => (
          <option key={String(option.value)} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    ),
    Slider: ({ value, onChange, min = 0, max = 100, step = 1, inputId }: any) => (
      <input
        aria-label={inputId}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.currentTarget.value))}
      />
    ),
    TextArea: ({ value, onChange, placeholder }: any) => (
      <textarea aria-label={placeholder ?? undefined} value={value} onChange={onChange} />
    ),
    CollapsableSection: ({ label, children }: { label: string; children: React.ReactNode }) => (
      <section>
        <h2>{label}</h2>
        {children}
      </section>
    ),
    ColorPicker: ({ color, onChange }: any) => (
      <input type="text" value={color} onChange={(event) => onChange(event.currentTarget.value)} />
    ),
  };
});

jest.mock('../layers/registry', () => ({
  getLayer: (type: string) =>
    type === 'path'
      ? {
          type: 'path',
          label: 'Path',
          defaultOptions: {
            widthMinPixels: 2,
            widthMaxPixels: 10,
            widthScale: 1,
            widthField: '',
            capRounded: true,
            jointRounded: true,
            layerBlendEnabled: false,
          },
          optionsSchema: [
            { key: 'widthMinPixels', label: 'Min width (px)', type: 'number', defaultValue: 2, section: 'Path' },
          ],
        }
      : {
          type: 'scatterplot',
          label: 'Scatter Plot',
          defaultOptions: {
            radiusMinPixels: 4,
            radiusMaxPixels: 20,
            radiusScale: 1,
            radiusField: '',
            stroked: true,
            showLabels: false,
            labelField: '',
            layerBlendEnabled: false,
          },
          optionsSchema: [
            { key: 'radiusMinPixels', label: 'Min radius (px)', type: 'number', defaultValue: 4, section: 'Point' },
          ],
        },
  getAllLayerTypes: () => [
    {
      type: 'scatterplot',
      label: 'Scatter Plot',
      defaultOptions: {
        radiusMinPixels: 4,
        radiusMaxPixels: 20,
        radiusScale: 1,
        radiusField: '',
        stroked: true,
        showLabels: false,
        labelField: '',
        layerBlendEnabled: false,
      },
      optionsSchema: [
        { key: 'radiusMinPixels', label: 'Min radius (px)', type: 'number', defaultValue: 4, section: 'Point' },
      ],
    },
    {
      type: 'path',
      label: 'Path',
      defaultOptions: {
        widthMinPixels: 2,
        widthMaxPixels: 10,
        widthScale: 1,
        widthField: '',
        capRounded: true,
        jointRounded: true,
        layerBlendEnabled: false,
      },
      optionsSchema: [
        { key: 'widthMinPixels', label: 'Min width (px)', type: 'number', defaultValue: 2, section: 'Path' },
      ],
    },
  ],
  resolveLayerOptions: (type: string, options?: Record<string, unknown>) => {
    const defaults =
      type === 'path'
        ? {
            widthMinPixels: 2,
            widthMaxPixels: 10,
            widthScale: 1,
            widthField: '',
            capRounded: true,
            jointRounded: true,
            layerBlendEnabled: false,
          }
        : {
            radiusMinPixels: 4,
            radiusMaxPixels: 20,
            radiusScale: 1,
            radiusField: '',
            stroked: true,
            showLabels: false,
            labelField: '',
            layerBlendEnabled: false,
          };

    return { ...defaults, ...(options ?? {}) };
  },
  extractSharedLayerOptions: (options?: Record<string, unknown>) => ({
    layerBlendEnabled: options?.layerBlendEnabled ?? false,
  }),
}));

function createLayer(overrides: Partial<LayerConfig> = {}): LayerConfig {
  return {
    id: 'layer-1',
    type: 'scatterplot',
    label: 'Layer 1',
    visible: true,
    geometry: { type: 'none' },
    timeFilter: { mode: 'none', timeField: '' },
    fieldMappings: [],
    opacity: 1,
    options: {
      radiusMinPixels: 7,
      radiusMaxPixels: 20,
      radiusScale: 1,
      radiusField: '',
      stroked: true,
      showLabels: false,
      labelField: '',
      layerBlendEnabled: true,
    },
    ...overrides,
  };
}

function Harness({ initialLayer }: { initialLayer?: LayerConfig }) {
  const [layer, setLayer] = React.useState(initialLayer ?? createLayer());
  return (
    <div>
      <LayerEditor layer={layer} onChange={setLayer} availableFields={['depth', 'sensor_id']} availableRefIds={['A', 'B']} />
      <pre data-testid="layer-state">{JSON.stringify(layer)}</pre>
    </div>
  );
}

function currentLayer(): LayerConfig {
  return JSON.parse(screen.getByTestId('layer-state').textContent ?? '{}') as LayerConfig;
}

function colorModeSelect(): HTMLSelectElement {
  return screen.getAllByRole('combobox')[5] as HTMLSelectElement;
}

describe('LayerEditor interactions', () => {
  it('uses a query refId picker instead of free text', () => {
    render(<Harness />);

    const selects = screen.getAllByRole('combobox');
    fireEvent.change(selects[1], { target: { value: 'B' } });

    expect(currentLayer().queryRefId).toBe('B');

    fireEvent.change(selects[1], { target: { value: '' } });

    expect(currentLayer().queryRefId).toBeUndefined();
  });

  it('preserves shared options and resets renderer-specific options when switching layer type', () => {
    render(<Harness />);

    const selects = screen.getAllByRole('combobox');
    fireEvent.change(selects[0], { target: { value: 'path' } });

    expect(currentLayer()).toMatchObject({
      type: 'path',
      options: {
        layerBlendEnabled: true,
      },
    });
    expect(currentLayer().options).not.toHaveProperty('widthMinPixels');
    expect(currentLayer().options).not.toHaveProperty('radiusMinPixels');
  });

  it('creates the expected colorScale and shader payload when switching color modes', () => {
    render(<Harness />);

    fireEvent.change(colorModeSelect(), { target: { value: 'threshold' } });

    expect(currentLayer()).toMatchObject({
      colorScale: {
        type: 'threshold',
        field: '',
      },
      shader: {
        enabled: true,
        valueField: '',
      },
    });

    fireEvent.change(colorModeSelect(), { target: { value: 'gradient' } });

    expect(currentLayer()).toMatchObject({
      colorScale: {
        type: 'gradient',
        schemeName: 'FloodDepth',
        scaleMin: 0,
        scaleMax: 40,
      },
      shader: {
        enabled: true,
        valueField: '',
      },
    });
  });

  it('adds, edits, and removes threshold steps end to end', () => {
    render(<Harness />);

    fireEvent.change(colorModeSelect(), { target: { value: 'threshold' } });

    fireEvent.click(screen.getByRole('button', { name: '+ Add threshold' }));
    expect(currentLayer().colorScale?.steps).toHaveLength(6);

    fireEvent.change(screen.getByDisplayValue('58'), { target: { value: '60' } });
    expect(currentLayer().colorScale?.steps?.[5].value).toBe(60);

    const removeButtons = screen.getAllByRole('button', { name: '×' });
    fireEvent.click(removeButtons[5]);
    expect(currentLayer().colorScale?.steps).toHaveLength(5);
  });

  it('updates and resets the zoom range with explicit min/max inputs', () => {
    render(<Harness initialLayer={createLayer({ minZoom: 4, maxZoom: 18 })} />);

    fireEvent.change(screen.getByDisplayValue('4'), { target: { value: '6' } });
    fireEvent.change(screen.getByDisplayValue('18'), { target: { value: '20' } });

    expect(currentLayer()).toMatchObject({
      minZoom: 6,
      maxZoom: 20,
    });

    fireEvent.click(screen.getByRole('button', { name: 'Full range' }));

    expect(currentLayer().minZoom).toBeUndefined();
    expect(currentLayer().maxZoom).toBeUndefined();
  });
});
