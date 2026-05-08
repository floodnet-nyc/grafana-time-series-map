import React, { useCallback, useMemo } from 'react';
import { css } from '@emotion/css';
import {
  useStyles2,
  Input,
  Switch,
  Select,
  Slider,
  Field,
  TextArea,
  CollapsableSection,
  ColorPicker,
} from '@grafana/ui';
import type { GrafanaTheme2, SelectableValue } from '@grafana/data';
import type { LayerConfig, GeometrySource, TimeFilterMode, ElevationConfig, ColorStep } from '../types';
import { getAllLayerTypes } from '../layers/registry';
import type { LayerOptionField } from '../layers/types';
import { COLOR_SCHEMES, schemeToGradientCss } from '../utils/deckgl/colorSchemes';
import { DEFAULT_VS_FILTER_COLOR } from '../utils/deckgl/colorScales';

// ─── Constants ───────────────────────────────────────────────────────────────

const GEOMETRY_TYPES: Array<SelectableValue<string>> = [
  { label: 'Lat / Lng columns', value: 'latlng' },
  { label: 'WKB hex', value: 'wkb' },
  { label: 'WKT string', value: 'wkt' },
  { label: 'GeoJSON string', value: 'geojson' },
];

const TIME_FILTER_MODES: Array<SelectableValue<TimeFilterMode>> = [
  { label: 'None (show all rows)', value: 'none' },
  { label: 'Window (within time range)', value: 'window' },
  { label: 'ASOF (closest per series key)', value: 'asof' },
];

const COLOR_MODES: Array<SelectableValue<string>> = [
  { label: 'Fixed color', value: 'fixed' },
  { label: 'By threshold', value: 'threshold' },
  { label: 'By gradient', value: 'gradient' },
];

const SCHEME_OPTIONS: Array<SelectableValue<string>> = [
  { label: '── Domain-specific ──', value: '', description: '' },
  ...COLOR_SCHEMES.filter((s) => s.group === 'domain').map((s) => ({ label: s.label, value: s.name })),
  { label: '── Diverging ──', value: '', description: '' },
  ...COLOR_SCHEMES.filter((s) => s.group === 'diverging').map((s) => ({ label: s.label, value: s.name })),
  { label: '── Sequential ──', value: '', description: '' },
  ...COLOR_SCHEMES.filter((s) => s.group === 'sequential').map((s) => ({ label: s.label, value: s.name })),
  { label: '── Single hue ──', value: '', description: '' },
  ...COLOR_SCHEMES.filter((s) => s.group === 'singlehue').map((s) => ({ label: s.label, value: s.name })),
];

const DEFAULT_THRESHOLD_STEPS: ColorStep[] = [
  { value: 0,  color: [0,   155, 104, 255] },
  { value: 4,  color: [0,   204, 255, 255] },
  { value: 12, color: [253, 191, 75,  255] },
  { value: 24, color: [254, 77,  76,  255] },
  { value: 48, color: [215, 77,  254, 255] },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

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

function colorMode(layer: LayerConfig): string {
  if (!layer.colorScale || layer.colorScale.type === 'fixed') return 'fixed';
  if (layer.colorScale.type === 'threshold') return 'threshold';
  return 'gradient';
}

function activeScheme(layer: LayerConfig): string {
  return layer.colorScale?.schemeName ?? '';
}

// ─── FieldSelect: autocomplete field picker ───────────────────────────────────

interface FieldSelectProps {
  value: string;
  onChange: (v: string) => void;
  availableFields: string[];
  placeholder?: string;
}

function FieldSelect({ value, onChange, availableFields, placeholder }: FieldSelectProps) {
  const opts = useMemo(
    () => availableFields.map((f) => ({ label: f, value: f })),
    [availableFields],
  );
  return (
    <Select
      options={opts}
      value={value || null}
      onChange={(v) => onChange(v?.value ?? '')}
      allowCustomValue
      isClearable
      placeholder={placeholder ?? 'Field name…'}
      onCreateOption={(v) => onChange(v)}
    />
  );
}

// ─── ColorSchemePreview ───────────────────────────────────────────────────────

interface ColorSchemePreviewProps {
  schemeName: string;
  invert?: boolean;
}

function ColorSchemePreview({ schemeName, invert }: ColorSchemePreviewProps) {
  const styles = useStyles2(getStyles);
  const gradient = useMemo(() => schemeToGradientCss(schemeName, invert), [schemeName, invert]);
  return <div className={styles.schemePreview} style={{ background: gradient }} />;
}

// ─── Main editor ─────────────────────────────────────────────────────────────

interface Props {
  layer: LayerConfig;
  onChange: (layer: LayerConfig) => void;
  availableFields?: string[];
}

export function LayerEditor({ layer, onChange, availableFields = [] }: Props) {
  const styles = useStyles2(getStyles);
  const layerTypes = getAllLayerTypes().map((r) => ({ label: r.label, value: r.type }));

  const patch = useCallback(
    (updates: Partial<LayerConfig>) => onChange({ ...layer, ...updates }),
    [layer, onChange],
  );

  const patchGeom = (updates: Partial<GeometrySource>) =>
    patch({ geometry: { ...layer.geometry, ...updates } as GeometrySource });

  const patchElevation = (updates: Partial<ElevationConfig>) =>
    patch({
      elevation: {
        field: '',
        scale: 0.0254,
        depthTest: false,
        ...layer.elevation,
        ...updates,
      },
    });

  const patchTimeFilter = (updates: Partial<typeof layer.timeFilter>) =>
    patch({ timeFilter: { ...layer.timeFilter, ...updates } });

  const patchOpts = (key: string, value: unknown) =>
    patch({ options: { ...layer.options, [key]: value } });

  const patchShader = (updates: Partial<NonNullable<typeof layer.shader>>) =>
    patch({ shader: { enabled: false, valueField: '', ...layer.shader, ...updates } });

  const patchColor = (updates: Partial<NonNullable<typeof layer.colorScale>>) =>
    patch({ colorScale: { type: 'fixed', ...layer.colorScale, ...updates } });

  const currentRenderer = getAllLayerTypes().find((r) => r.type === layer.type);

  const optionsBySections = useMemo(() => {
    if (!currentRenderer) return new Map<string | undefined, LayerOptionField[]>();
    const map = new Map<string | undefined, LayerOptionField[]>();
    for (const f of currentRenderer.optionsSchema) {
      const s = f.section;
      if (!map.has(s)) map.set(s, []);
      map.get(s)!.push(f);
    }
    return map;
  }, [currentRenderer]);

  const fixedColor = layer.colorScale?.fixedColor ?? [0, 155, 104, 255];
  const mode = colorMode(layer);
  const scheme = activeScheme(layer);

  return (
    <div className={styles.container}>
      {/* ── Basic ─────────────────────────────── */}
      <Field label="Label">
        <Input value={layer.label} onChange={(e) => patch({ label: e.currentTarget.value })} />
      </Field>
      <Field label="Description" description="Shown as a tooltip on the legend info icon">
        <TextArea
          rows={2}
          value={layer.description ?? ''}
          onChange={(e) => patch({ description: e.currentTarget.value || undefined })}
          placeholder="Optional description…"
        />
      </Field>
      <Field label="Layer type">
        <Select options={layerTypes} value={layer.type} onChange={(v) => v.value && patch({ type: v.value })} />
      </Field>
      <Field label="Query (ref ID)">
        <Input
          placeholder="A (leave blank for first query)"
          value={layer.queryRefId ?? ''}
          onChange={(e) => patch({ queryRefId: e.currentTarget.value || undefined })}
        />
      </Field>
      <Field label="Visible">
        <Switch value={layer.visible} onChange={(e) => patch({ visible: e.currentTarget.checked })} />
      </Field>
      <Field label="Show in legend">
        <Switch
          value={layer.showInLegend ?? true}
          onChange={(e) => patch({ showInLegend: e.currentTarget.checked })}
        />
      </Field>
      <Field label="Opacity">
        <Slider inputId="layer-opacity" min={0} max={1} step={0.05} value={layer.opacity} onChange={(v) => patch({ opacity: v })} />
      </Field>
      <Field label="Min zoom">
        <Input
          type="number"
          value={layer.minZoom ?? ''}
          onChange={(e) => patch({ minZoom: e.currentTarget.value ? Number(e.currentTarget.value) : undefined })}
        />
      </Field>
      <Field label="Max zoom">
        <Input
          type="number"
          value={layer.maxZoom ?? ''}
          onChange={(e) => patch({ maxZoom: e.currentTarget.value ? Number(e.currentTarget.value) : undefined })}
        />
      </Field>

      {/* ── Geometry + Elevation ──────────────── */}
      <CollapsableSection label="Geometry" isOpen>
        <Field label="Geometry source">
          <Select
            options={GEOMETRY_TYPES}
            value={layer.geometry.type}
            onChange={(v) => v.value && patchGeom({ type: v.value as GeometrySource['type'] })}
          />
        </Field>
        {(layer.geometry.type === 'wkb' || layer.geometry.type === 'wkt' || layer.geometry.type === 'geojson') && (
          <Field label="Geometry field">
            <FieldSelect
              value={(layer.geometry as any).field ?? ''}
              onChange={(v) => patchGeom({ field: v } as any)}
              availableFields={availableFields}
            />
          </Field>
        )}
        {layer.geometry.type === 'latlng' && (
          <>
            <Field label="Latitude field">
              <FieldSelect
                value={(layer.geometry as any).latField ?? ''}
                onChange={(v) => patchGeom({ latField: v } as any)}
                availableFields={availableFields}
              />
            </Field>
            <Field label="Longitude field">
              <FieldSelect
                value={(layer.geometry as any).lngField ?? ''}
                onChange={(v) => patchGeom({ lngField: v } as any)}
                availableFields={availableFields}
              />
            </Field>
          </>
        )}

        {/* Elevation (merged into geometry) */}
        <Field label="Elevation field" description="Leave empty to render flat">
          <FieldSelect
            value={layer.elevation?.field ?? ''}
            onChange={(v) => patchElevation({ field: v })}
            availableFields={availableFields}
            placeholder="None"
          />
        </Field>
        {layer.elevation?.field && (
          <>
          </>
        )}
        <Field label="Elevation scale" description="Multiply field value to get meters (e.g. 0.0254 = inches→m)">
          <Input
            type="number"
            value={layer.elevation?.scale ?? (layer.elevation?.field ? 0.0254 : 0)}
            onChange={(e) => patchElevation({ scale: Number(e.currentTarget.value) })}
          />
        </Field>
        <Field label="Depth test">
          <Switch
            value={layer.elevation?.depthTest ?? false}
            onChange={(e) => patchElevation({ depthTest: e.currentTarget.checked })}
          />
        </Field>
      </CollapsableSection>

      {/* ── Time filter ───────────────────────── */}
      <CollapsableSection label="Time filter" isOpen>
        <Field label="Mode">
          <Select
            options={TIME_FILTER_MODES}
            value={layer.timeFilter.mode}
            onChange={(v) => v.value && patchTimeFilter({ mode: v.value })}
          />
        </Field>
        {layer.timeFilter.mode !== 'none' && (
          <Field label="Time field">
            <FieldSelect
              value={layer.timeFilter.timeField ?? ''}
              onChange={(v) => patchTimeFilter({ timeField: v })}
              availableFields={availableFields}
            />
          </Field>
        )}
        {layer.timeFilter.mode === 'window' && (
          <Field label="Tolerance (ms)" description="Extend the window by this many ms on each side">
            <Input
              type="number"
              value={layer.timeFilter.windowToleranceMs ?? 0}
              onChange={(e) => patchTimeFilter({ windowToleranceMs: Number(e.currentTarget.value) })}
            />
          </Field>
        )}
        {layer.timeFilter.mode === 'asof' && (
          <>
            <Field label="Group-by field">
              <FieldSelect
                value={layer.timeFilter.groupByField ?? ''}
                onChange={(v) => patchTimeFilter({ groupByField: v })}
                availableFields={availableFields}
              />
            </Field>
            <Field label="Max lag (ms)">
              <Input
                type="number"
                value={layer.timeFilter.maxLagMs ?? 3600000}
                onChange={(e) => patchTimeFilter({ maxLagMs: Number(e.currentTarget.value) })}
              />
            </Field>
          </>
        )}
      </CollapsableSection>

      {/* ── Color ─────────────────────────────── */}
      <CollapsableSection label="Color" isOpen>
        <Field label="Color mode">
          <Select
            options={COLOR_MODES}
            value={mode}
            onChange={(v) => {
              if (v.value === 'fixed') {
                patch({ colorScale: { type: 'fixed', fixedColor: [0, 155, 104, 255] } });
              } else if (v.value === 'threshold') {
                patch({
                  colorScale: {
                    type: 'threshold',
                    field: layer.colorScale?.field ?? '',
                    steps: DEFAULT_THRESHOLD_STEPS,
                  },
                  shader: { enabled: true, valueField: layer.colorScale?.field ?? '', vsDecl: '', vsFilterColor: DEFAULT_VS_FILTER_COLOR },
                });
              } else {
                patch({
                  colorScale: {
                    type: 'gradient',
                    schemeName: 'FloodDepth',
                    scaleMin: 0,
                    scaleMax: 40,
                    field: layer.colorScale?.field ?? '',
                  },
                  shader: { enabled: true, valueField: layer.colorScale?.field ?? '', vsDecl: '', vsFilterColor: DEFAULT_VS_FILTER_COLOR },
                });
              }
            }}
          />
        </Field>

        {mode === 'fixed' && (
          <Field label="Color">
            <div className={styles.colorPickerRow}>
              <ColorPicker
                color={rgbaToHex(fixedColor as [number, number, number, number])}
                onChange={(hex) => patchColor({ type: 'fixed', fixedColor: hexToRgba(hex) })}
              />
            </div>
          </Field>
        )}

        {mode === 'threshold' && (
          <>
            <Field label="Value field">
              <FieldSelect
                value={layer.colorScale?.field ?? ''}
                onChange={(v) => { patchColor({ field: v }); patchShader({ valueField: v }); }}
                availableFields={availableFields}
              />
            </Field>
            {(layer.colorScale?.steps ?? DEFAULT_THRESHOLD_STEPS).map((step, i) => {
              const steps = layer.colorScale?.steps ?? DEFAULT_THRESHOLD_STEPS;
              return (
                <div key={i} className={styles.thresholdRow}>
                  <span className={styles.thresholdLabel}>≥</span>
                  <Input
                    type="number"
                    className={styles.thresholdValue}
                    value={step.value}
                    onChange={(e) => {
                      const next = steps.map((s, j) =>
                        j === i ? { ...s, value: Number(e.currentTarget.value) } : s,
                      );
                      patchColor({ steps: next });
                    }}
                  />
                  <div className={styles.colorPickerRow}>
                    <ColorPicker
                      color={rgbaToHex(step.color)}
                      onChange={(hex) => {
                        const next = steps.map((s, j) =>
                          j === i ? { ...s, color: hexToRgba(hex) } : s,
                        );
                        patchColor({ steps: next });
                      }}
                    />
                  </div>
                  <button
                    className={styles.thresholdRemove}
                    onClick={() => patchColor({ steps: steps.filter((_, j) => j !== i) })}
                    disabled={steps.length <= 1}
                  >
                    ×
                  </button>
                </div>
              );
            })}
            <button
              className={styles.thresholdAdd}
              onClick={() => {
                const steps = layer.colorScale?.steps ?? DEFAULT_THRESHOLD_STEPS;
                const last = steps[steps.length - 1];
                patchColor({ steps: [...steps, { value: (last?.value ?? 0) + 10, color: [200, 200, 200, 255] }] });
              }}
            >
              + Add threshold
            </button>
          </>
        )}

        {mode === 'gradient' && (
          <>
            <Field label="Value field">
              <FieldSelect
                value={layer.colorScale?.field ?? layer.shader?.valueField ?? ''}
                onChange={(v) => { patchColor({ field: v }); patchShader({ valueField: v }); }}
                availableFields={availableFields}
              />
            </Field>
            <Field label="Color scheme">
              <Select
                options={SCHEME_OPTIONS.filter((o) => o.value !== '')}
                value={scheme || null}
                onChange={(v) => patchColor({ schemeName: v?.value || undefined })}
                isClearable
                placeholder="Choose scheme…"
              />
            </Field>
            {scheme && (
              <>
                <Field label="">
                  <ColorSchemePreview schemeName={scheme} invert={layer.colorScale?.invert} />
                </Field>
                <Field label="Invert">
                  <Switch
                    value={layer.colorScale?.invert ?? false}
                    onChange={(e) => patchColor({ invert: e.currentTarget.checked })}
                  />
                </Field>
                <Field label="Scale min">
                  <Input
                    type="number"
                    value={layer.colorScale?.scaleMin}
                    onChange={(e) => patchColor({ scaleMin: Number(e.currentTarget.value) })}
                  />
                </Field>
                <Field label="Scale max">
                  <Input
                    type="number"
                    value={layer.colorScale?.scaleMax}
                    onChange={(e) => patchColor({ scaleMax: Number(e.currentTarget.value) })}
                  />
                </Field>
              </>
            )}
            <Field
              label="Additional GLSL declarations"
              description="Injected after the auto-generated interpolateColor(float v)."
            >
              <TextArea
                rows={4}
                value={layer.shader?.vsDecl ?? ''}
                onChange={(e) => patchShader({ vsDecl: e.currentTarget.value })}
                placeholder="// e.g. custom normalization or helper functions"
              />
            </Field>
            <Field
              label="Color filter (vs:DECKGL_FILTER_COLOR)"
              description="GLSL injected into the vertex shader to set the final color."
            >
              <TextArea
                rows={5}
                value={layer.shader?.vsFilterColor ?? DEFAULT_VS_FILTER_COLOR}
                onChange={(e) => patchShader({ vsFilterColor: e.currentTarget.value })}
              />
            </Field>
          </>
        )}
      </CollapsableSection>

      {/* ── Layer-type options (grouped by section) ── */}
      {currentRenderer && currentRenderer.optionsSchema.length > 0 &&
        Array.from(optionsBySections.entries()).map(([section, fields]) => (
          <CollapsableSection
            key={section ?? '__default'}
            label={section ? `${currentRenderer.label} — ${section}` : currentRenderer.label}
            isOpen
          >
            {fields.map((f) => (
              <Field key={f.key} label={f.label}>
                {f.type === 'boolean' ? (
                  <Switch
                    value={Boolean(layer.options[f.key] ?? f.defaultValue)}
                    onChange={(e) => patchOpts(f.key, e.currentTarget.checked)}
                  />
                ) : f.type === 'select' ? (
                  <Select
                    options={f.selectOptions ?? []}
                    value={layer.options[f.key] ?? f.defaultValue}
                    onChange={(v) => patchOpts(f.key, v.value)}
                  />
                ) : f.type === 'fieldPicker' ? (
                  <FieldSelect
                    value={String(layer.options[f.key] ?? f.defaultValue ?? '')}
                    onChange={(v) => patchOpts(f.key, v)}
                    availableFields={availableFields}
                  />
                ) : (
                  <Input
                    type={f.type === 'number' ? 'number' : 'text'}
                    value={String(layer.options[f.key] ?? f.defaultValue ?? '')}
                    onChange={(e) =>
                      patchOpts(f.key, f.type === 'number' ? Number(e.currentTarget.value) : e.currentTarget.value)
                    }
                  />
                )}
              </Field>
            ))}
          </CollapsableSection>
        ))}
    </div>
  );
}

function getStyles(theme: GrafanaTheme2) {
  return {
    container: css({
      display: 'flex',
      flexDirection: 'column',
      gap: theme.spacing(0.5),
      padding: theme.spacing(1),
    }),
    colorPickerRow: css({
      display: 'flex',
      alignItems: 'center',
      height: 32,
    }),
    schemePreview: css({
      height: 10,
      borderRadius: theme.shape.radius.default,
      width: '100%',
    }),
    thresholdRow: css({
      display: 'flex',
      alignItems: 'center',
      gap: theme.spacing(0.75),
      marginBottom: theme.spacing(0.5),
    }),
    thresholdLabel: css({
      fontSize: 12,
      color: theme.colors.text.secondary,
      width: 12,
      flexShrink: 0,
    }),
    thresholdValue: css({
      width: 72,
      flexShrink: 0,
    }),
    thresholdRemove: css({
      background: 'none',
      border: 'none',
      color: theme.colors.text.secondary,
      cursor: 'pointer',
      fontSize: 16,
      padding: '0 4px',
      '&:hover': { color: theme.colors.error.text },
      '&:disabled': { opacity: 0.3, cursor: 'default' },
    }),
    thresholdAdd: css({
      background: 'none',
      border: `1px solid ${theme.colors.border.medium}`,
      borderRadius: theme.shape.radius.default,
      color: theme.colors.text.secondary,
      cursor: 'pointer',
      fontSize: 12,
      padding: '4px 8px',
      marginTop: theme.spacing(0.5),
      '&:hover': { color: theme.colors.text.primary, borderColor: theme.colors.border.strong },
    }),
  };
}
