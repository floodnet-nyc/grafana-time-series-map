import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { LightingEditor } from './LightingEditor';
import type { DeckLightingOptions } from '../types';

jest.mock('@grafana/ui', () => {
  const React = require('react');
  return {
    useStyles2: (getStyles: (theme: any) => any) =>
      getStyles({
        spacing: () => '0px',
        shape: { radius: { default: 0 } },
        colors: {
          text: { secondary: '#666', primary: '#000' },
          border: { weak: '#ccc' },
          background: { secondary: '#f5f5f5' },
          action: { hover: '#eee', selected: '#ddd' },
        },
      }),
    Field: ({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) => (
      <label className={className}>
        <span>{label}</span>
        {children}
      </label>
    ),
    Input: ({ value, onChange, type = 'text' }: any) => <input type={type} value={value} onChange={onChange} />,
    Switch: ({ value, onChange }: any) => <input type="checkbox" checked={value} onChange={onChange} />,
    Combobox: ({ options = [], value, onChange }: any) => (
      <select value={value ?? ''} onChange={(event) => onChange({ value: event.currentTarget.value })}>
        {options.map((option: any, index: number) => (
          <option key={`${String(option.value)}-${index}`} value={option.value}>
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
    ColorPicker: ({ color, onChange }: any) => <input aria-label="color" value={color} onChange={(event) => onChange(event.currentTarget.value)} />,
    Button: ({ children, onClick }: any) => <button onClick={onClick}>{children}</button>,
    IconButton: ({ tooltip, name, onClick }: any) => (
      <button aria-label={tooltip ?? name} onClick={onClick}>
        {tooltip ?? name}
      </button>
    ),
  };
});

function Harness({ initialValue }: { initialValue?: DeckLightingOptions }) {
  const [value, setValue] = React.useState<DeckLightingOptions>(
    initialValue ?? {
      enabled: true,
      lights: [
        { id: 'ambient-1', type: 'ambient', color: [255, 255, 255], intensity: 1 },
        { id: 'point-1', type: 'point', color: [255, 255, 255], intensity: 0.8, longitude: 0, latitude: 0, altitude: 8000 },
      ],
    },
  );

  return (
    <div>
      <LightingEditor value={value} onChange={(next) => setValue(next ?? {})} item={{} as any} context={{} as any} />
      <pre data-testid="lighting-state">{JSON.stringify(value)}</pre>
    </div>
  );
}

function currentLighting(): DeckLightingOptions {
  return JSON.parse(screen.getByTestId('lighting-state').textContent ?? '{}') as DeckLightingOptions;
}

describe('LightingEditor', () => {
  it('edits the selected light through the shared list shell', () => {
    render(<Harness />);

    fireEvent.click(screen.getByText('ambient-1'));
    const idInput = screen.getByDisplayValue('ambient-1');
    fireEvent.change(idInput, { target: { value: 'ambient-renamed' } });

    expect(currentLighting().lights?.[0].id).toBe('ambient-renamed');
  });

  it('adds a light and selects it for editing', () => {
    render(<Harness />);

    fireEvent.click(screen.getByText('Add light'));

    const lighting = currentLighting();
    expect(lighting.lights).toHaveLength(3);
    expect(lighting.lights?.[2].type).toBe('point');
    expect(screen.getByDisplayValue(lighting.lights?.[2].id ?? '')).toBeInTheDocument();
  });

  it('removes the selected light and clears the editor selection', () => {
    render(<Harness />);

    fireEvent.click(screen.getByText('point-1'));
    expect(screen.getByDisplayValue('point-1')).toBeInTheDocument();

    fireEvent.click(screen.getAllByLabelText('Remove')[1]);

    expect(currentLighting().lights).toHaveLength(1);
    expect(screen.queryByDisplayValue('point-1')).not.toBeInTheDocument();
  });
});
