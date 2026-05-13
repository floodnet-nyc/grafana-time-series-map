import React, { useCallback, useMemo } from 'react';
import { css } from '@emotion/css';
import {
  useStyles2,
  Input,
  Switch,
  Combobox,
  Slider,
  Field,
  TextArea,
  CollapsableSection,
  ColorPicker,
  Button,
  type ComboboxOption,
} from '@grafana/ui';
import type { GrafanaTheme2 } from '@grafana/data';
import type {
  ColorScaleConfig,
  ElevationConfig,
  GeometrySource,
  LayerDerivedFieldConfig,
  LayerSecondarySourceConfig,
  ShaderConfig,
  TimeFilterConfig,
  TimeFilterMode,
} from '../types';
import type { LayerConfig, LayerOptionField } from '../layers/types';
import { layerExtensionDefinitions } from '../layers/extensions';
import { layerDefinitions } from '../layers/_all';
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

const GEOMETRY_TYPES: Array<ComboboxOption<string>> = [
  { label: 'Lat / Lng columns', value: 'latlng' },
  { label: 'WKB hex', value: 'wkb' },
  { label: 'WKT string', value: 'wkt' },
  { label: 'GeoJSON string', value: 'geojson' },
  { label: 'None', value: 'none' },
];

const TIME_FILTER_MODES: Array<ComboboxOption<TimeFilterMode>> = [
  { label: 'None (show all rows)', value: 'none' },
  { label: 'Window (within time range)', value: 'window' },
  { label: 'ASOF (closest per series key)', value: 'asof' },
];

const DERIVED_FIELD_TYPES: Array<ComboboxOption<string>> = [
  { label: 'Number', value: 'number' },
  { label: 'String', value: 'string' },
  { label: 'Boolean', value: 'boolean' },
];

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

const DEFAULT_MIN_ZOOM = 0;
const DEFAULT_MAX_ZOOM = 24;

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

function clampZoom(value: number): number {
  return Math.max(DEFAULT_MIN_ZOOM, Math.min(DEFAULT_MAX_ZOOM, value));
}

function parseZoomInput(value: string, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? clampZoom(parsed) : fallback;
}

function getDefaultSecondarySource(primaryQueryRefId: string | undefined, availableRefIds: string[]): LayerSecondarySourceConfig {
  const preferredQueryRefId = availableRefIds.find((refId) => refId !== primaryQueryRefId) ?? availableRefIds[0] ?? '';
  return {
    queryRefId: preferredQueryRefId,
    join: {
      type: 'keyed-asof',
      localKeyField: '',
      remoteKeyField: '',
      timeField: '',
      maxLagMs: 3600000,
    },
    fields: [{ sourceField: '' }],
  };
}

interface FieldSelectProps {
  value: string;
  onChange: (v: string) => void;
  availableFields: string[];
  placeholder?: string;
}

function FieldSelect({ value, onChange, availableFields, placeholder }: FieldSelectProps) {
  const opts = useMemo(() => availableFields.map((f) => ({ label: f, value: f })), [availableFields]);
  return (
    <Combobox
      options={opts}
      value={value || null}
      onChange={(v) => onChange(v?.value != null ? String(v.value) : '')}
      isClearable
      createCustomValue
      placeholder={placeholder ?? 'Field name…'}
    />
  );
}

function ColorSchemePreview({ schemeName, invert }: { schemeName: string; invert?: boolean }) {
  const styles = useStyles2(getStyles);
  const gradient = useMemo(() => schemeToGradientCss(schemeName, invert), [schemeName, invert]);
  return <div className={styles.schemePreview} style={{ background: gradient }} />;
}

interface Props {
  layer: LayerConfig;
  onChange: (layer: LayerConfig) => void;
  availableFields?: string[];
  availableRefIds?: string[];
  queryFieldsByRefId?: Record<string, string[]>;
}

export function LayerEditor({ layer, onChange, availableFields = [], availableRefIds = [], queryFieldsByRefId = {} }: Props) {
  const styles = useStyles2(getStyles);
  const layerTypes = useMemo(() => layerDefinitions.map((r) => ({ label: r.label, value: r.type })), []);
  const extensionDefinitions = useMemo(() => layerExtensionDefinitions, []);
  const refIdOptions = useMemo(
    () => [{ label: 'First query', value: '' }, ...availableRefIds.map((refId) => ({ label: refId, value: refId }))],
    [availableRefIds],
  );
  const currentRenderer = useMemo(() => layerDefinitions.find((definition) => definition.type === layer.type), [layer.type]);
  const fixedColor = layer.colorScale?.fixedColor ?? [0, 155, 104, 255];
  const mode = getColorMode(layer);
  const scheme = getActiveScheme(layer);
  const secondarySources = layer.secondarySources ?? [];
  const derivedFields = layer.derivedFields ?? [];
  const settingsRecord = layer.settings as unknown as Record<string, unknown>;

  const patch = useCallback((updates: Partial<LayerConfig>) => onChange({ ...(layer as any), ...updates } as LayerConfig), [layer, onChange]);
  const patchTimeFilter = useCallback((updates: Partial<TimeFilterConfig>) => patch({ timeFilter: { ...layer.timeFilter, ...updates } }), [layer.timeFilter, patch]);
  const patchSecondarySources = useCallback((value: LayerSecondarySourceConfig[]) => patch({ secondarySources: value }), [patch]);
  const patchDerivedFields = useCallback((value: LayerDerivedFieldConfig[]) => patch({ derivedFields: value }), [patch]);
  const patchShader = useCallback((updates: Partial<ShaderConfig>) => patch({ shader: createPatchedShader(layer.shader, updates) }), [layer.shader, patch]);
  const patchColor = useCallback((updates: Partial<NonNullable<ColorScaleConfig>>) => patch({ colorScale: createPatchedColorScale(layer.colorScale, updates) }), [layer.colorScale, patch]);

  const patchElevation = useCallback(
    (updates: Partial<ElevationConfig>) =>
      patch({
        elevation: {
          field: '',
          scale: 0.0254,
          depthTest: false,
          ...layer.elevation,
          ...updates,
        },
      }),
    [layer.elevation, patch],
  );

  const patchSettings = useCallback(
    (key: string, value: unknown) =>
      patch({ settings: { ...(layer.settings as any), [key]: value } } as Partial<LayerConfig>),
    [layer.settings, patch],
  );

  const patchExtensionValue = useCallback(
    (extensionKey: string, key: string, value: unknown) => {
      const current = (layer.extensions ?? {}) as Record<string, Record<string, unknown>>;
      patch({
        extensions: {
          ...layer.extensions,
          [extensionKey]: {
            ...(current[extensionKey] ?? {}),
            [key]: value,
          },
        },
      });
    },
    [layer.extensions, patch],
  );

  const patchGeometryType = useCallback(
    (type: GeometrySource['type']) => {
      const geometry: GeometrySource =
        type === 'none'
          ? { type: 'none' }
          : type === 'latlng'
            ? { type: 'latlng', latField: '', lngField: '' }
            : { type, field: '' };
      patch({ geometry });
    },
    [patch],
  );

  const patchGeometryField = useCallback(
    (value: string) => {
      const geometry = layer.geometry;
      if (geometry.type === 'wkb' || geometry.type === 'wkt' || geometry.type === 'geojson') {
        patch({ geometry: { ...geometry, field: value } });
      }
    },
    [layer.geometry, patch],
  );

  const patchGeometryLat = useCallback(
    (value: string) => {
      const geometry = layer.geometry;
      if (geometry.type === 'latlng') {
        patch({ geometry: { ...geometry, latField: value } });
      }
    },
    [layer.geometry, patch],
  );

  const patchGeometryLng = useCallback(
    (value: string) => {
      const geometry = layer.geometry;
      if (geometry.type === 'latlng') {
        patch({ geometry: { ...geometry, lngField: value } });
      }
    },
    [layer.geometry, patch],
  );

  const patchZoomRange = useCallback(
    (min: number, max: number) => {
      const nextMin = clampZoom(Math.min(min, max));
      const nextMax = clampZoom(Math.max(min, max));
      patch({
        minZoom: nextMin <= DEFAULT_MIN_ZOOM ? undefined : nextMin,
        maxZoom: nextMax >= DEFAULT_MAX_ZOOM ? undefined : nextMax,
      });
    },
    [patch],
  );

  const getFieldsForRefId = useCallback((refId: string | undefined) => (refId ? queryFieldsByRefId[refId] ?? [] : []), [queryFieldsByRefId]);

  const handleTypeChange = useCallback(
    (type: string) => {
      const definition = layerDefinitions.find((item) => item.type === type);
      if (!definition) {
        return;
      }
      const next = definition.createDefaultConfig(0);
      onChange({
        ...next,
        id: layer.id,
        label: layer.label,
        visible: layer.visible,
        queryRefId: layer.queryRefId,
        geometry: layer.geometry,
        elevation: layer.elevation,
        timeFilter: layer.timeFilter,
        fieldMappings: layer.fieldMappings,
        opacity: layer.opacity,
        colorScale: layer.colorScale,
        showInLegend: layer.showInLegend,
        description: layer.description,
        minZoom: layer.minZoom,
        maxZoom: layer.maxZoom,
        pickable: layer.pickable,
        shader: layer.shader,
        extensions: layer.extensions ?? next.extensions,
      });
    },
    [layer, onChange],
  );

  const renderOptionField = useCallback(
    (field: LayerOptionField, source: Record<string, unknown>, onFieldChange: (key: string, value: unknown) => void) => {
      const value = source[field.key] ?? field.defaultValue;
      if (field.showIf && !field.showIf(source)) {
        return null;
      }
      if (field.type === 'boolean') {
        return (
          <Field key={field.key} label={field.label}>
            <Switch value={Boolean(value)} onChange={(e) => onFieldChange(field.key, e.currentTarget.checked)} />
          </Field>
        );
      }
      if (field.type === 'select') {
        return (
          <Field key={field.key} label={field.label}>
            <Combobox
              options={field.selectOptions ?? []}
              value={value as string | number | null}
              onChange={(v) => onFieldChange(field.key, v?.value)}
            />
          </Field>
        );
      }
      if (field.type === 'fieldPicker') {
        return (
          <Field key={field.key} label={field.label}>
            <FieldSelect value={String(value ?? '')} onChange={(v) => onFieldChange(field.key, v)} availableFields={availableFields} />
          </Field>
        );
      }
      if (field.type === 'color') {
        return (
          <Field key={field.key} label={field.label}>
            <ColorPicker color={rgbaToHex((value as [number, number, number, number]) ?? [0, 0, 0, 255])} onChange={(hex) => onFieldChange(field.key, hexToRgba(hex))} />
          </Field>
        );
      }
      if (field.type === 'number') {
        return (
          <Field key={field.key} label={field.label}>
            <Input
              type="number"
              value={String(value ?? field.defaultValue ?? '')}
              onChange={(e) => onFieldChange(field.key, Number(e.currentTarget.value))}
            />
          </Field>
        );
      }
      return (
        <Field key={field.key} label={field.label}>
          <Input value={String(value ?? '')} onChange={(e) => onFieldChange(field.key, e.currentTarget.value)} />
        </Field>
      );
    },
    [availableFields],
  );

  return (
    <div className={styles.root}>
      <CollapsableSection label="General" isOpen>
        <Field label="Layer name">
          <Input value={layer.label} onChange={(e) => patch({ label: e.currentTarget.value })} />
        </Field>
        <Field label="Layer type">
          <Combobox options={layerTypes} value={layer.type} onChange={(v) => v?.value && handleTypeChange(String(v.value))} />
        </Field>
        <Field label="Query">
          <Combobox options={refIdOptions} value={layer.queryRefId ?? ''} onChange={(v) => patch({ queryRefId: String(v?.value ?? '') || undefined })} />
        </Field>
        <Field label="Visible">
          <Switch value={layer.visible} onChange={(e) => patch({ visible: e.currentTarget.checked })} />
        </Field>
        <Field label="Show in legend">
          <Switch value={layer.showInLegend ?? true} onChange={(e) => patch({ showInLegend: e.currentTarget.checked })} />
        </Field>
      </CollapsableSection>

      <CollapsableSection label="Geometry" isOpen>
        <Field label="Geometry source">
          <Combobox options={GEOMETRY_TYPES} value={layer.geometry.type} onChange={(v) => patchGeometryType(v.value as GeometrySource['type'])} />
        </Field>
        {(layer.geometry.type === 'wkb' || layer.geometry.type === 'wkt' || layer.geometry.type === 'geojson') && (
          <Field label="Geometry field">
            <FieldSelect value={layer.geometry.field} onChange={patchGeometryField} availableFields={availableFields} />
          </Field>
        )}
        {layer.geometry.type === 'latlng' && (
          <>
            <Field label="Latitude field">
              <FieldSelect value={layer.geometry.latField} onChange={patchGeometryLat} availableFields={availableFields} />
            </Field>
            <Field label="Longitude field">
              <FieldSelect value={layer.geometry.lngField} onChange={patchGeometryLng} availableFields={availableFields} />
            </Field>
          </>
        )}
        <Field label="Elevation field" description="Leave empty to render flat">
          <FieldSelect value={layer.elevation?.field ?? ''} onChange={(v) => patchElevation({ field: v })} availableFields={availableFields} placeholder="None" />
        </Field>
        {layer.elevation?.field && (
          <>
            <Field label="Elevation scale">
              <Input type="number" value={String(layer.elevation.scale ?? 0.0254)} onChange={(e) => patchElevation({ scale: Number(e.currentTarget.value) })} />
            </Field>
            <Field label="Depth test">
              <Switch value={layer.elevation?.depthTest ?? false} onChange={(e) => patchElevation({ depthTest: e.currentTarget.checked })} />
            </Field>
          </>
        )}
      </CollapsableSection>

      <CollapsableSection label="Time" isOpen={false}>
        <Field label="Mode">
          <Combobox options={TIME_FILTER_MODES} value={layer.timeFilter.mode} onChange={(v) => patchTimeFilter({ mode: v.value as TimeFilterMode })} />
        </Field>
        {layer.timeFilter.mode !== 'none' && (
          <Field label="Time field">
            <FieldSelect value={layer.timeFilter.timeField} onChange={(v) => patchTimeFilter({ timeField: v })} availableFields={availableFields} />
          </Field>
        )}
        {layer.timeFilter.mode === 'asof' && (
          <>
            <Field label="Group-by field">
              <FieldSelect value={layer.timeFilter.groupByField ?? ''} onChange={(v) => patchTimeFilter({ groupByField: v })} availableFields={availableFields} />
            </Field>
            <Field label="Max lag (ms)">
              <Input type="number" value={String(layer.timeFilter.maxLagMs ?? 0)} onChange={(e) => patchTimeFilter({ maxLagMs: Number(e.currentTarget.value) })} />
            </Field>
          </>
        )}
        {layer.timeFilter.mode === 'window' && (
          <Field label="Window tolerance (ms)">
            <Input type="number" value={String(layer.timeFilter.windowToleranceMs ?? 0)} onChange={(e) => patchTimeFilter({ windowToleranceMs: Number(e.currentTarget.value) })} />
          </Field>
        )}
      </CollapsableSection>

      <CollapsableSection label="Data" isOpen={false}>
        <Field label="Derived fields">
          <Button size="sm" variant="secondary" onClick={() => patchDerivedFields([...(derivedFields ?? []), { as: '', expression: '', type: 'number' }])}>
            Add derived field
          </Button>
        </Field>
        {derivedFields.map((field, index) => (
          <div key={`derived-${index}`} className={styles.card}>
            <Field label="Name">
              <Input value={field.as} onChange={(e) => patchDerivedFields(derivedFields.map((item, i) => (i === index ? { ...item, as: e.currentTarget.value } : item)))} />
            </Field>
            <Field label="Expression">
              <TextArea value={field.expression} onChange={(e) => patchDerivedFields(derivedFields.map((item, i) => (i === index ? { ...item, expression: e.currentTarget.value } : item)))} />
            </Field>
            <Field label="Type">
              <Combobox
                options={DERIVED_FIELD_TYPES}
                value={field.type ?? 'number'}
                onChange={(value) =>
                  patchDerivedFields(
                    derivedFields.map((item, i) =>
                      i === index ? { ...item, type: value?.value as 'number' | 'string' | 'boolean' } : item,
                    ),
                  )
                }
              />
            </Field>
            <Button size="sm" variant="destructive" onClick={() => patchDerivedFields(derivedFields.filter((_, i) => i !== index))}>
              Remove derived field
            </Button>
          </div>
        ))}
        <Field label="Secondary sources">
          <Button size="sm" variant="secondary" onClick={() => patchSecondarySources([...(secondarySources ?? []), getDefaultSecondarySource(layer.queryRefId, availableRefIds)])}>
            Add secondary source
          </Button>
        </Field>
        {secondarySources.map((source, index) => {
          const sourceFields = getFieldsForRefId(source.queryRefId);
          return (
            <div key={source.queryRefId || index} className={styles.card}>
              <Field label="Query">
                <Combobox
                  options={refIdOptions}
                  value={source.queryRefId}
                  onChange={(v) =>
                    patchSecondarySources(
                      secondarySources.map((item, i) => (i === index ? { ...item, queryRefId: String(v?.value ?? '') } : item)),
                    )
                  }
                />
              </Field>
              <Field label="Local key field">
                <FieldSelect
                  value={source.join.localKeyField}
                  onChange={(value) =>
                    patchSecondarySources(
                      secondarySources.map((item, i) => (i === index ? { ...item, join: { ...item.join, localKeyField: value } } : item)),
                    )
                  }
                  availableFields={availableFields}
                />
              </Field>
              <Field label="Remote key field">
                <FieldSelect
                  value={source.join.remoteKeyField}
                  onChange={(value) =>
                    patchSecondarySources(
                      secondarySources.map((item, i) => (i === index ? { ...item, join: { ...item.join, remoteKeyField: value } } : item)),
                    )
                  }
                  availableFields={sourceFields}
                />
              </Field>
              <Field label="Time field">
                <FieldSelect
                  value={source.join.timeField}
                  onChange={(value) =>
                    patchSecondarySources(
                      secondarySources.map((item, i) => (i === index ? { ...item, join: { ...item.join, timeField: value } } : item)),
                    )
                  }
                  availableFields={sourceFields}
                />
              </Field>
              <Field label="Max lag (ms)">
                <Input
                  type="number"
                  value={String(source.join.maxLagMs ?? 3600000)}
                  onChange={(e) =>
                    patchSecondarySources(
                      secondarySources.map((item, i) =>
                        i === index ? { ...item, join: { ...item.join, maxLagMs: Number(e.currentTarget.value) } } : item,
                      ),
                    )
                  }
                />
              </Field>
              <Field label="Source fields">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() =>
                    patchSecondarySources(
                      secondarySources.map((item, i) =>
                        i === index ? { ...item, fields: [...item.fields, { sourceField: '' }] } : item,
                      ),
                    )
                  }
                >
                  Add source field
                </Button>
              </Field>
              {source.fields.map((mappedField, fieldIndex) => (
                <div key={`${source.queryRefId || index}-field-${fieldIndex}`} className={styles.nestedCard}>
                  <Field label="Source field">
                    <FieldSelect
                      value={mappedField.sourceField}
                      onChange={(value) =>
                        patchSecondarySources(
                          secondarySources.map((item, i) =>
                            i === index
                              ? {
                                  ...item,
                                  fields: item.fields.map((fieldItem, j) => (j === fieldIndex ? { ...fieldItem, sourceField: value } : fieldItem)),
                                }
                              : item,
                          ),
                        )
                      }
                      availableFields={sourceFields}
                    />
                  </Field>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() =>
                      patchSecondarySources(
                        secondarySources.map((item, i) =>
                          i === index ? { ...item, fields: item.fields.filter((_, j) => j !== fieldIndex) } : item,
                        ),
                      )
                    }
                  >
                    Remove source field
                  </Button>
                </div>
              ))}
              <Button
                size="sm"
                variant="destructive"
                onClick={() => patchSecondarySources(secondarySources.filter((_, i) => i !== index))}
              >
                Remove secondary source
              </Button>
            </div>
          );
        })}
      </CollapsableSection>

      <CollapsableSection label="Appearance" isOpen={false}>
        <Field label="Opacity">
          <Slider value={layer.opacity} min={0} max={1} step={0.01} onChange={(value) => patch({ opacity: Number(value) })} inputId="opacity" />
        </Field>
        <Field label="Description">
          <TextArea value={layer.description ?? ''} onChange={(e) => patch({ description: e.currentTarget.value || undefined })} />
        </Field>
        <Field label="Zoom range">
          <div className={styles.zoomRow}>
            <Input value={String(layer.minZoom ?? DEFAULT_MIN_ZOOM)} onChange={(e) => patchZoomRange(parseZoomInput(e.currentTarget.value, layer.minZoom ?? DEFAULT_MIN_ZOOM), layer.maxZoom ?? DEFAULT_MAX_ZOOM)} />
            <Input value={String(layer.maxZoom ?? DEFAULT_MAX_ZOOM)} onChange={(e) => patchZoomRange(layer.minZoom ?? DEFAULT_MIN_ZOOM, parseZoomInput(e.currentTarget.value, layer.maxZoom ?? DEFAULT_MAX_ZOOM))} />
          </div>
        </Field>
      </CollapsableSection>

      <CollapsableSection label="Color" isOpen={false}>
        <Field label="Mode">
          <Combobox
            options={COLOR_MODES}
            value={mode}
            onChange={(v) => patch(createColorModePatch(v.value as 'fixed' | 'threshold' | 'gradient', layer, DEFAULT_VS_FILTER_COLOR))}
          />
        </Field>
        {mode === 'fixed' && (
          <Field label="Fixed color">
            <ColorPicker color={rgbaToHex(fixedColor)} onChange={(hex) => patchColor({ fixedColor: hexToRgba(hex), type: 'fixed' })} />
          </Field>
        )}
        {mode === 'threshold' && (
          <>
            <Field label="Value field">
              <FieldSelect value={layer.colorScale?.field ?? ''} onChange={(v) => patchColor({ field: v })} availableFields={availableFields} />
            </Field>
            {(layer.colorScale?.steps ?? []).map((step, index) => (
              <div key={`threshold-${index}`} className={styles.thresholdRow}>
                <Input value={String(step.value)} onChange={(e) => patchColor({ steps: patchThresholdStep(layer.colorScale?.steps ?? [], index, { value: Number(e.currentTarget.value) }) })} />
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
      </CollapsableSection>

      {extensionDefinitions.map((extension) => {
        const source = ((layer.extensions ?? {}) as Record<string, Record<string, unknown>>)[extension.id] ?? {};
        return extension.editorSections.map((editorSection) => (
          <CollapsableSection key={`${extension.id}-${editorSection.title}`} label={editorSection.title} isOpen={false}>
            {editorSection.fields.map((field) => renderOptionField(field, source, (key, value) => patchExtensionValue(extension.id, key, value)))}
          </CollapsableSection>
        ));
      })}

      {currentRenderer?.editorSections.map((editorSection) => (
        <CollapsableSection key={editorSection.title} label={editorSection.title} isOpen={false}>
          {editorSection.fields.map((field) => renderOptionField(field, settingsRecord, patchSettings))}
        </CollapsableSection>
      ))}
    </div>
  );
}

function getStyles(theme: GrafanaTheme2) {
  return {
    root: css({ display: 'flex', flexDirection: 'column', gap: theme.spacing(1), padding: theme.spacing(1) }),
    schemePreview: css({ height: 18, borderRadius: theme.shape.radius.default, marginBottom: theme.spacing(1) }),
    zoomRow: css({ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: theme.spacing(1) }),
    thresholdRow: css({ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: theme.spacing(1), alignItems: 'center', marginBottom: theme.spacing(1) }),
    card: css({ border: `1px solid ${theme.colors.border.weak}`, padding: theme.spacing(1), borderRadius: theme.shape.radius.default, marginBottom: theme.spacing(1) }),
    nestedCard: css({ border: `1px solid ${theme.colors.border.weak}`, padding: theme.spacing(1), borderRadius: theme.shape.radius.default, marginBottom: theme.spacing(1) }),
  };
}
