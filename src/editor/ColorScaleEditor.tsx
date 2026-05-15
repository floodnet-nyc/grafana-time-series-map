import React, { useMemo } from 'react';
import { css } from '@emotion/css';
import {
  useStyles2,
  Field,
  Combobox,
  Switch,
  Input,
  TextArea,
  CollapsableSection,
  ColorPicker,
  Button,
  type ComboboxOption,
} from '@grafana/ui';
import type { GrafanaTheme2 } from '@grafana/data';
import type { ColorScaleConfig, ShaderConfig } from '../types';
import type { LayerConfig } from '../layers/types';
import { COLOR_SCHEMES, schemeToGradientCss } from '../utils/deckgl/colorSchemes';
import { DEFAULT_VS_FILTER_COLOR } from '../utils/deckgl/colorScales';
import {
  appendThresholdStep,
  createColorModePatch,
  createPatchedColorScale,
  createPatchedShader,
  getActiveScheme,
  getColorMode,
  patchThresholdStep,
  removeThresholdStep,
} from './layerEditorModel';
import { FieldSelect } from './FieldSelect';

const COLOR_MODES: Array<ComboboxOption<string>> = [
  { label: 'Fixed color', value: 'fixed' },
  { label: 'By threshold', value: 'threshold' },
  { label: 'By gradient', value: 'gradient' },
];

const SCHEME_OPTIONS: Array<ComboboxOption<string>> = [
  { label: '── Domain-specific ──', value: '', description: '' },
  ...COLOR_SCHEMES.filter((s) => s.group === 'domain').map((s) => ({ label: s.label, value: s.name })),
  { label: '── Diverging ──', value: '', description: '' },
  ...COLOR_SCHEMES.filter((s) => s.group === 'diverging').map((s) => ({ label: s.label, value: s.name })),
  { label: '── Sequential ──', value: '', description: '' },
  ...COLOR_SCHEMES.filter((s) => s.group === 'sequential').map((s) => ({ label: s.label, value: s.name })),
  { label: '── Single hue ──', value: '', description: '' },
  ...COLOR_SCHEMES.filter((s) => s.group === 'singlehue').map((s) => ({ label: s.label, value: s.name })),
];

function rgbaToHex([r, g, b, a]: [number, number, number, number]): string {
  const h = (n: number) => Math.round(Math.max(0, Math.min(255, n))).toString(16).padStart(2, '0');
  return `#${h(r)}${h(g)}${h(b)}${a < 255 ? h(a) : ''}`;
}

function hexToRgba(hex: string): [number, number, number, number] {
  const c = hex.replace('#', '');
  const r = parseInt(c.slice(0, 2), 16) || 0;
  const g = parseInt(c.slice(2, 4), 16) || 0;
  const b = parseInt(c.slice(4, 6), 16) || 0;
  const a = c.length >= 8 ? parseInt(c.slice(6, 8), 16) : 255;
  return [r, g, b, a];
}

function ColorSchemePreview({ schemeName, invert }: { schemeName: string; invert?: boolean }) {
  const styles = useStyles2(getStyles);
  const gradient = useMemo(() => schemeToGradientCss(schemeName, invert), [schemeName, invert]);
  return <div className={styles.schemePreview} style={{ background: gradient }} />;
}

interface Props {
  layer: LayerConfig;
  availableFields: string[];
  onChange: (updates: Partial<LayerConfig>) => void;
}

export function ColorScaleEditor({ layer, availableFields, onChange }: Props) {
  const styles = useStyles2(getStyles);
  const mode = getColorMode(layer);
  const scheme = getActiveScheme(layer);
  const fixedColor = layer.colorScale?.fixedColor ?? [0, 155, 104, 255];

  const patchColor = (updates: Partial<ColorScaleConfig>) =>
    onChange({ colorScale: createPatchedColorScale(layer.colorScale, updates) });

  const patchShader = (updates: Partial<ShaderConfig>) =>
    onChange({ shader: createPatchedShader(layer.shader, updates) });

  return (
    <>
      <Field label="Mode">
        <Combobox
          options={COLOR_MODES}
          value={mode}
          onChange={(v) => onChange(createColorModePatch(v.value as 'fixed' | 'threshold' | 'gradient', layer, DEFAULT_VS_FILTER_COLOR))}
        />
      </Field>
      {mode === 'fixed' && (
        <Field label="Fixed color">
          <ColorPicker
            color={rgbaToHex(fixedColor as [number, number, number, number])}
            onChange={(hex) => patchColor({ fixedColor: hexToRgba(hex), type: 'fixed' })}
          />
        </Field>
      )}
      {mode === 'threshold' && (
        <>
          <Field label="Value field">
            <FieldSelect value={layer.colorScale?.field ?? ''} onChange={(v) => patchColor({ field: v })} availableFields={availableFields} />
          </Field>
          {(layer.colorScale?.steps ?? []).map((step, index) => (
            <div key={`threshold-${index}`} className={styles.thresholdRow}>
              <Input
                value={String(step.value)}
                onChange={(e) => patchColor({ steps: patchThresholdStep(layer.colorScale?.steps ?? [], index, { value: Number(e.currentTarget.value) }) })}
              />
              <ColorPicker
                color={rgbaToHex(step.color)}
                onChange={(hex) => patchColor({ steps: patchThresholdStep(layer.colorScale?.steps ?? [], index, { color: hexToRgba(hex) }) })}
              />
              <Button size="sm" variant="destructive" onClick={() => patchColor({ steps: removeThresholdStep(layer.colorScale?.steps ?? [], index) })}>
                Remove
              </Button>
            </div>
          ))}
          <Button size="sm" variant="secondary" onClick={() => patchColor({ steps: appendThresholdStep(layer.colorScale?.steps ?? []) })}>
            Add threshold
          </Button>
        </>
      )}
      {mode === 'gradient' && (
        <>
          <Field label="Value field">
            <FieldSelect value={layer.colorScale?.field ?? ''} onChange={(v) => patchColor({ field: v })} availableFields={availableFields} />
          </Field>
          <Field label="Scheme">
            <Combobox options={SCHEME_OPTIONS} value={scheme || ''} onChange={(v) => patchColor({ schemeName: String(v?.value ?? '') })} />
          </Field>
          {scheme && <ColorSchemePreview schemeName={scheme} invert={layer.colorScale?.invert} />}
          <Field label="Scale min">
            <Input type="number" value={String(layer.colorScale?.scaleMin ?? 0)} onChange={(e) => patchColor({ scaleMin: Number(e.currentTarget.value) })} />
          </Field>
          <Field label="Scale max">
            <Input type="number" value={String(layer.colorScale?.scaleMax ?? 1)} onChange={(e) => patchColor({ scaleMax: Number(e.currentTarget.value) })} />
          </Field>
          <Field label="Invert">
            <Switch value={layer.colorScale?.invert ?? false} onChange={(e) => patchColor({ invert: e.currentTarget.checked })} />
          </Field>
        </>
      )}
      <CollapsableSection label="Shader" isOpen={false}>
        <Field label="Enabled">
          <Switch value={layer.shader?.enabled ?? false} onChange={(e) => patchShader({ enabled: e.currentTarget.checked })} />
        </Field>
        <Field label="Value field">
          <FieldSelect value={layer.shader?.valueField ?? ''} onChange={(v) => patchShader({ valueField: v })} availableFields={availableFields} />
        </Field>
        <Field label="Custom vertex declarations">
          <TextArea value={layer.shader?.vsDecl ?? ''} onChange={(e) => patchShader({ vsDecl: e.currentTarget.value })} />
        </Field>
        <Field label="Vertex filter color">
          <TextArea value={layer.shader?.vsFilterColor ?? DEFAULT_VS_FILTER_COLOR} onChange={(e) => patchShader({ vsFilterColor: e.currentTarget.value })} />
        </Field>
      </CollapsableSection>
    </>
  );
}

function getStyles(theme: GrafanaTheme2) {
  return {
    schemePreview: css({ height: 18, borderRadius: theme.shape.radius.default, marginBottom: theme.spacing(1) }),
    thresholdRow: css({
      display: 'grid',
      gridTemplateColumns: '1fr 1fr auto',
      gap: theme.spacing(1),
      alignItems: 'center',
      marginBottom: theme.spacing(1),
    }),
  };
}
