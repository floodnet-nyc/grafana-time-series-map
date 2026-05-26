import React, { useCallback } from 'react';
import { css } from '@emotion/css';
import { ColorPicker, Combobox, Field, Input, Slider, Switch, useStyles2, type ComboboxOption } from '@grafana/ui';
import type { GrafanaTheme2, StandardEditorProps } from '@grafana/data';
import type { DeckLightColor, DeckLightConfig, DeckLightingOptions, DeckLightType } from 'types';
import { DEFAULT_DECK_LIGHTING } from 'utils/deckgl/lighting';
import { SelectableListEditor } from 'editor/utils/SelectableListEditor';
import { useSelectableListState } from 'editor/utils/useSelectableListState';

const lightTypes: Array<ComboboxOption<DeckLightType>> = [
  { label: 'Ambient', value: 'ambient' },
  { label: 'Point', value: 'point' },
  { label: 'Directional', value: 'directional' },
  { label: 'Camera', value: 'camera' },
  { label: 'Sun', value: 'sun' },
];

const DEFAULT_SUN_TIMESTAMP = Date.UTC(2024, 7, 1, 22);

function defaultLight(type: DeckLightType, index: number): DeckLightConfig {
  const id = `${type}-light-${Date.now()}-${index}`;
  switch (type) {
    case 'ambient':
      return { id, type, color: [255, 255, 255], intensity: 1 };
    case 'point':
      return {
        id,
        type,
        color: [255, 255, 255],
        intensity: 0.8,
        longitude: 0,
        latitude: 0,
        altitude: 8000,
        attenuationConstant: 1,
        attenuationLinear: 0,
        attenuationQuadratic: 0,
      };
    case 'directional':
      return {
        id,
        type,
        color: [255, 255, 255],
        intensity: 1,
        directionX: 0,
        directionY: 0,
        directionZ: -1,
        shadow: false,
      };
    case 'camera':
      return { id, type, color: [255, 255, 255], intensity: 1 };
    case 'sun':
      return { id, type, color: [255, 255, 255], intensity: 1, timestamp: DEFAULT_SUN_TIMESTAMP, shadow: false };
    default:
      return { id, type, color: [255, 255, 255], intensity: 1 };
  }
}

function numberValue(value: unknown, fallback: number) {
  const n = Number(value ?? fallback);
  return Number.isFinite(n) ? n : fallback;
}

function colorToHex(value: DeckLightColor | undefined) {
  const parts = Array.isArray(value) ? value : [255, 255, 255];
  const [r = 255, g = 255, b = 255] = parts;
  const h = (n: number) =>
    Math.round(Math.max(0, Math.min(255, n)))
      .toString(16)
      .padStart(2, '0');
  return `#${h(r)}${h(g)}${h(b)}`;
}

function hexToColor(hex: string, previous?: DeckLightColor): DeckLightColor {
  const c = hex.replace('#', '');
  const r = parseInt(c.slice(0, 2), 16) || 0;
  const g = parseInt(c.slice(2, 4), 16) || 0;
  const b = parseInt(c.slice(4, 6), 16) || 0;
  if (Array.isArray(previous) && previous.length === 4) {
    return [r, g, b, previous[3]];
  }
  return [r, g, b];
}

interface NumberFieldProps {
  label: string;
  value: unknown;
  fallback: number;
  onChange: (value: number) => void;
}

interface SliderFieldProps {
  inputId: string;
  label: string;
  value: unknown;
  fallback: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
}

function SliderField({ inputId, label, value, fallback, min, max, step, onChange }: SliderFieldProps) {
  return (
    <Field label={label}>
      <Slider
        inputId={inputId}
        min={min}
        max={max}
        step={step}
        value={numberValue(value, fallback)}
        onChange={onChange}
      />
    </Field>
  );
}

function NumberField({ label, value, fallback, onChange }: NumberFieldProps) {
  return (
    <Field label={label}>
      <Input
        type="number"
        value={String(numberValue(value, fallback))}
        onChange={(event) => onChange(Number(event.currentTarget.value))}
      />
    </Field>
  );
}

export function LightingEditor({ value, onChange }: StandardEditorProps<DeckLightingOptions>) {
  const styles = useStyles2(getStyles);
  const lighting = value ?? DEFAULT_DECK_LIGHTING;
  const lights = lighting.lights ?? DEFAULT_DECK_LIGHTING.lights;

  const patch = useCallback(
    (updates: Partial<DeckLightingOptions>) => {
      onChange({ ...lighting, ...updates });
    },
    [lighting, onChange]
  );

  const {
    selectedIndex,
    setSelectedIndex,
    patchAt: patchLight,
    addItem: addLightItem,
    removeAt: removeLight,
    moveAt: moveLight,
  } = useSelectableListState({
    items: lights,
    onChange: (next) => patch({ lights: next }),
  });

  const addLight = useCallback(() => {
    addLightItem(defaultLight('point', lights.length));
  }, [addLightItem, lights.length]);

  return (
    <div className={styles.container}>
      <Switch value={lighting.enabled ?? false} onChange={(event) => patch({ enabled: event.currentTarget.checked })} />
      {lighting.enabled && (
        <SelectableListEditor
          items={lights}
          selectedIndex={selectedIndex}
          onSelect={setSelectedIndex}
          getItemKey={(light, index) => `${light.id}-${index}`}
          getItemLabel={(light, index) => light.id || `${light.type} light ${index + 1}`}
          addButtonLabel="Add light"
          onAdd={addLight}
          onMove={moveLight}
          onRemove={removeLight}
          renderEditor={(light, index) => (
            <div className={styles.light}>
              <Field label="Type" className={styles.typeField}>
                <Combobox
                  options={lightTypes}
                  value={light.type}
                  onChange={(selected) =>
                    selected?.value && patchLight(index, { ...defaultLight(selected.value, index), id: light.id })
                  }
                />
              </Field>
              <Field label="ID">
                <Input value={light.id} onChange={(event) => patchLight(index, { id: event.currentTarget.value })} />
              </Field>
              <Field label="Color">
                <div className={styles.colorPickerRow}>
                  <ColorPicker
                    color={colorToHex(light.color)}
                    onChange={(hex) => patchLight(index, { color: hexToColor(hex, light.color) })}
                  />
                </div>
              </Field>
              <SliderField
                inputId={`light-${index}-intensity`}
                label="Intensity"
                value={light.intensity}
                fallback={1}
                min={0}
                max={2}
                step={0.05}
                onChange={(intensity) => patchLight(index, { intensity })}
              />
              {light.type === 'point' && (
                <>
                  <SliderField
                    inputId={`light-${index}-longitude`}
                    label="Longitude"
                    value={light.longitude}
                    fallback={0}
                    min={-180}
                    max={180}
                    step={0.000001}
                    onChange={(longitude) => patchLight(index, { longitude })}
                  />
                  <SliderField
                    inputId={`light-${index}-latitude`}
                    label="Latitude"
                    value={light.latitude}
                    fallback={0}
                    min={-90}
                    max={90}
                    step={0.000001}
                    onChange={(latitude) => patchLight(index, { latitude })}
                  />
                  <NumberField
                    label="Altitude"
                    value={light.altitude}
                    fallback={1}
                    onChange={(altitude) => patchLight(index, { altitude })}
                  />
                  <NumberField
                    label="Attenuation constant"
                    value={light.attenuationConstant}
                    fallback={1}
                    onChange={(attenuationConstant) => patchLight(index, { attenuationConstant })}
                  />
                  <NumberField
                    label="Attenuation linear"
                    value={light.attenuationLinear}
                    fallback={0}
                    onChange={(attenuationLinear) => patchLight(index, { attenuationLinear })}
                  />
                  <NumberField
                    label="Attenuation quadratic"
                    value={light.attenuationQuadratic}
                    fallback={0}
                    onChange={(attenuationQuadratic) => patchLight(index, { attenuationQuadratic })}
                  />
                </>
              )}
              {light.type === 'directional' && (
                <>
                  <SliderField
                    inputId={`light-${index}-direction-x`}
                    label="Direction X"
                    value={light.directionX}
                    fallback={0}
                    min={-1}
                    max={1}
                    step={0.05}
                    onChange={(directionX) => patchLight(index, { directionX })}
                  />
                  <SliderField
                    inputId={`light-${index}-direction-y`}
                    label="Direction Y"
                    value={light.directionY}
                    fallback={0}
                    min={-1}
                    max={1}
                    step={0.05}
                    onChange={(directionY) => patchLight(index, { directionY })}
                  />
                  <SliderField
                    inputId={`light-${index}-direction-z`}
                    label="Direction Z"
                    value={light.directionZ}
                    fallback={-1}
                    min={-1}
                    max={1}
                    step={0.05}
                    onChange={(directionZ) => patchLight(index, { directionZ })}
                  />
                  <Field label="Shadow">
                    <Switch
                      value={light.shadow ?? false}
                      onChange={(event) => patchLight(index, { shadow: event.currentTarget.checked })}
                    />
                  </Field>
                </>
              )}
              {light.type === 'sun' && (
                <>
                  <NumberField
                    label="Timestamp"
                    value={light.timestamp}
                    fallback={DEFAULT_SUN_TIMESTAMP}
                    onChange={(timestamp) => patchLight(index, { timestamp })}
                  />
                  <Field label="Shadow">
                    <Switch
                      value={light.shadow ?? false}
                      onChange={(event) => patchLight(index, { shadow: event.currentTarget.checked })}
                    />
                  </Field>
                </>
              )}
            </div>
          )}
        />
      )}
    </div>
  );
}

function getStyles(theme: GrafanaTheme2) {
  return {
    container: css({ display: 'flex', flexDirection: 'column', gap: theme.spacing(1) }),
    light: css({ display: 'flex', flexDirection: 'column', gap: theme.spacing(1), padding: theme.spacing(1) }),
    typeField: css({ flex: 1 }),
    colorPickerRow: css({
      display: 'flex',
      alignItems: 'center',
      height: 32,
    }),
  };
}
