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
  type ComboboxOption,
} from '@grafana/ui';
import type { GrafanaTheme2 } from '@grafana/data';
import type {
  LayerConfig,
  GeometrySource,
  TimeFilterMode,
  ElevationConfig,
  LayerSecondarySourceConfig,
  LayerDerivedFieldConfig,
} from '../types';
import { extractSharedLayerOptions, getAllLayerTypes, getLayer } from '../layers/registry';
import type { LayerOptionField } from '../layers/types';
import { COLOR_SCHEMES, schemeToGradientCss } from '../utils/deckgl/colorSchemes';
import { DEFAULT_VS_FILTER_COLOR } from '../utils/deckgl/colorScales';
import {
  appendThresholdStep,
  createColorModePatch,
  createPatchedColorScale,
  createPatchedShader,
  DEFAULT_THRESHOLD_STEPS,
  getActiveScheme,
  getColorMode,
  groupOptionsBySection,
  patchThresholdStep,
  removeThresholdStep,
  splitOptionSections,
} from './layerEditorModel';

// ─── Constants ───────────────────────────────────────────────────────────────

const GEOMETRY_TYPES: Array<ComboboxOption<string>> = [
  { label: 'Lat / Lng columns', value: 'latlng' },
  { label: 'WKB hex', value: 'wkb' },
  { label: 'WKT string', value: 'wkt' },
  { label: 'GeoJSON string', value: 'geojson' },
];

const TIME_FILTER_MODES: Array<ComboboxOption<TimeFilterMode>> = [
  { label: 'None (show all rows)', value: 'none' },
  { label: 'Window (within time range)', value: 'window' },
  { label: 'ASOF (closest per series key)', value: 'asof' },
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

function clampZoom(value: number): number {
  return Math.max(DEFAULT_MIN_ZOOM, Math.min(DEFAULT_MAX_ZOOM, value));
}

function parseZoomInput(value: string, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? clampZoom(parsed) : fallback;
}

function getDefaultSecondarySource(
  primaryQueryRefId: string | undefined,
  availableRefIds: string[],
  index: number,
): LayerSecondarySourceConfig {
  const preferredQueryRefId = availableRefIds.find((refId) => refId !== primaryQueryRefId) ?? availableRefIds[0] ?? '';
  return {
    id: index === 0 ? 'sensor' : `source${index + 1}`,
    queryRefId: preferredQueryRefId,
    join: {
      type: 'keyed-asof',
      localKeyField: '',
      remoteKeyField: '',
      timeField: '',
      maxLagMs: 3600000,
    },
    fields: [{ sourceField: '', as: '' }],
  };
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
  availableRefIds?: string[];
  queryFieldsByRefId?: Record<string, string[]>;
}

export function LayerEditor({
  layer,
  onChange,
  availableFields = [],
  availableRefIds = [],
  queryFieldsByRefId = {},
}: Props) {
  const styles = useStyles2(getStyles);
  const layerTypes = useMemo(
    () => getAllLayerTypes().map((r) => ({ label: r.label, value: r.type })),
    []
  );
  const refIdOptions = useMemo(
    () => [{ label: 'First query', value: '' }, ...availableRefIds.map((refId) => ({ label: refId, value: refId }))],
    [availableRefIds]
  );

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
  const patchSecondarySources = (secondarySources: LayerSecondarySourceConfig[]) => patch({ secondarySources });
  const patchDerivedFields = (derivedFields: LayerDerivedFieldConfig[]) => patch({ derivedFields });

  const patchOpts = (key: string, value: unknown) => patch({ options: { ...layer.options, [key]: value } });

  const patchShader = (updates: Partial<NonNullable<typeof layer.shader>>) =>
    patch({ shader: createPatchedShader(layer.shader, updates) });

  const patchColor = (updates: Partial<NonNullable<typeof layer.colorScale>>) =>
    patch({ colorScale: createPatchedColorScale(layer.colorScale, updates) });

  const patchZoomRange = useCallback(
    (min: number, max: number) => {
      const nextMin = clampZoom(Math.min(min, max));
      const nextMax = clampZoom(Math.max(min, max));
      patch({
        minZoom: nextMin <= DEFAULT_MIN_ZOOM ? undefined : nextMin,
        maxZoom: nextMax >= DEFAULT_MAX_ZOOM ? undefined : nextMax,
      });
    },
    [patch]
  );

  const currentRenderer = useMemo(() => getLayer(layer.type), [layer.type]);
  const defaultOptions = useMemo(() => currentRenderer?.defaultOptions ?? {}, [currentRenderer]);

  const optionsBySections = useMemo(() => {
    if (!currentRenderer) {
      return new Map<string | undefined, LayerOptionField[]>();
    }
    return groupOptionsBySection(currentRenderer.optionsSchema);
  }, [currentRenderer]);

  const fixedColor = layer.colorScale?.fixedColor ?? [0, 155, 104, 255];
  const mode = getColorMode(layer);
  const scheme = getActiveScheme(layer);
  const zoomRange = [layer.minZoom ?? DEFAULT_MIN_ZOOM, layer.maxZoom ?? DEFAULT_MAX_ZOOM];
  const { regular: regularOptionSections, advancedColor: advancedColorOptionSections } = splitOptionSections(optionsBySections);
  const secondarySources = layer.secondarySources ?? [];
  const derivedFields = layer.derivedFields ?? [];
  const getOptionValue = useCallback(
    (field: LayerOptionField) => layer.options[field.key] ?? defaultOptions[field.key] ?? field.defaultValue,
    [defaultOptions, layer.options]
  );
  const getFieldsForRefId = useCallback(
    (refId: string | undefined) => (refId ? queryFieldsByRefId[refId] ?? [] : []),
    [queryFieldsByRefId]
  );

  const updateSecondarySource = (index: number, updates: Partial<LayerSecondarySourceConfig>) => {
    const next = secondarySources.map((source, sourceIndex) =>
      sourceIndex === index ? { ...source, ...updates } : source
    );
    patchSecondarySources(next);
  };

  const updateSecondarySourceJoin = (
    index: number,
    updates: Partial<LayerSecondarySourceConfig['join']>
  ) => {
    const source = secondarySources[index];
    if (!source) {
      return;
    }
    updateSecondarySource(index, { join: { ...source.join, ...updates } });
  };

  const updateSecondarySourceField = (
    sourceIndex: number,
    fieldIndex: number,
    updates: Partial<LayerSecondarySourceConfig['fields'][number]>
  ) => {
    const source = secondarySources[sourceIndex];
    if (!source) {
      return;
    }

    patchSecondarySources(
      secondarySources.map((candidate, candidateIndex) =>
        candidateIndex === sourceIndex
          ? {
              ...candidate,
              fields: candidate.fields.map((field, candidateFieldIndex) =>
                candidateFieldIndex === fieldIndex ? { ...field, ...updates } : field
              ),
            }
          : candidate
      )
    );
  };

  const updateDerivedField = (index: number, updates: Partial<LayerDerivedFieldConfig>) => {
    patchDerivedFields(derivedFields.map((field, fieldIndex) => (fieldIndex === index ? { ...field, ...updates } : field)));
  };
  const appendExpressionToken = (index: number, token: string) => {
    const field = derivedFields[index];
    if (!field) {
      return;
    }
    const nextExpression = field.expression ? `${field.expression} ${token}` : token;
    updateDerivedField(index, { expression: nextExpression });
  };
  const applyFloodDepthPreset = () => {
    patch({
      secondarySources: [
        {
          id: 'sensor',
          queryRefId: availableRefIds.find((refId) => refId !== layer.queryRefId) ?? availableRefIds[0] ?? '',
          join: {
            type: 'keyed-asof',
            localKeyField: 'deployment_id',
            remoteKeyField: 'deployment_id',
            timeField: 'time',
            maxLagMs: 600000,
          },
          fields: [{ sourceField: 'depth_inches', as: 'depth' }],
        },
      ],
      derivedFields: [
        {
          as: 'depthDiff',
          expression: 'sensor.depth - primary.contour_depth_inches',
          type: 'number',
        },
      ],
    });
  };

  const renderOptionField = (f: LayerOptionField) => {
    const value = getOptionValue(f);
    return (
    <Field key={f.key} label={f.label}>
      {f.type === 'boolean' ? (
        <Switch
          value={Boolean(value)}
          onChange={(e) => patchOpts(f.key, e.currentTarget.checked)}
        />
      ) : f.type === 'select' ? (
        <Combobox
          options={f.selectOptions ?? []}
          value={value as string | number}
          onChange={(v) => patchOpts(f.key, v.value)}
        />
      ) : f.type === 'fieldPicker' ? (
        <FieldSelect
          value={String(value ?? '')}
          onChange={(v) => patchOpts(f.key, v)}
          availableFields={availableFields}
        />
      ) : f.type === 'color' ? (
        <div className={styles.colorPickerRow}>
          <ColorPicker
            color={rgbaToHex((value ?? [255, 255, 255, 255]) as [number, number, number, number])}
            onChange={(hex) => patchOpts(f.key, hexToRgba(hex))}
          />
        </div>
      ) : f.type === 'number' && f.min !== undefined && f.max !== undefined ? (
        <Slider
          inputId={`layer-option-${f.key}`}
          min={f.min}
          max={f.max}
          step={f.step ?? 1}
          value={Number(value ?? f.min)}
          onChange={(v) => patchOpts(f.key, v)}
        />
      ) : (
        <Input
          type={f.type === 'number' ? 'number' : 'text'}
          value={String(value ?? '')}
          onChange={(e) =>
            patchOpts(f.key, f.type === 'number' ? Number(e.currentTarget.value) : e.currentTarget.value)
          }
        />
      )}
    </Field>
    );
  };

  return (
    <div className={styles.container}>
      <CollapsableSection label="General" isOpen>
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
          <Combobox
            options={layerTypes}
            value={layer.type}
            onChange={(v) =>
              patch({
                type: v.value,
                options: extractSharedLayerOptions(layer.options),
              })
            }
          />
        </Field>
        <Field label="Query (ref ID)">
          <Combobox
            options={refIdOptions}
            value={layer.queryRefId ?? ''}
            onChange={(v) => patch({ queryRefId: v.value ? String(v.value) : undefined })}
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
      </CollapsableSection>

      <CollapsableSection label="Geometry" isOpen>
        <Field label="Geometry source">
          <Combobox
            options={GEOMETRY_TYPES}
            value={layer.geometry.type}
            onChange={(v) => patchGeom({ type: v.value as GeometrySource['type'] })}
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

        <div className={styles.sectionHint}>
          {layer.geometry.type === 'latlng'
            ? 'Coordinates come from the selected latitude and longitude fields.'
            : layer.geometry.type === 'none'
              ? 'This layer does not read map geometry from the query.'
              : 'Geometry is read directly from the selected field.'}
        </div>
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
            <Field label="Elevation scale" description="Multiply field value to get meters (e.g. 0.0254 = inches to meters)">
              <Input
                type="number"
                value={layer.elevation?.scale ?? 1}
                onChange={(e) => patchElevation({ scale: Number(e.currentTarget.value) })}
              />
            </Field>
            <Field label="Depth test">
              <Switch
                value={layer.elevation?.depthTest ?? false}
                onChange={(e) => patchElevation({ depthTest: e.currentTarget.checked })}
              />
            </Field>
          </>
        )}
      </CollapsableSection>

      <CollapsableSection label="Time" isOpen={false}>
        <div className={styles.sectionHint}>
          {layer.timeFilter.mode === 'none'
            ? 'All rows are shown.'
            : layer.timeFilter.mode === 'window'
              ? 'Rows are filtered to the dashboard time range.'
              : 'Closest row per series key is shown at the playback cursor.'}
        </div>
        <Field label="Mode">
          <Combobox
            options={TIME_FILTER_MODES}
            value={layer.timeFilter.mode}
            onChange={(v) => patchTimeFilter({ mode: v.value })}
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

      <CollapsableSection label="Dataflow" isOpen={false}>
        <div className={styles.sectionHint}>
          Join secondary query results onto this layer and define derived values like deltas or ratios.
        </div>
        <div className={styles.inlineActions}>
          <button
            type="button"
            className={styles.inlineAction}
            onClick={() => patchSecondarySources([...secondarySources, getDefaultSecondarySource(layer.queryRefId, availableRefIds, secondarySources.length)])}
          >
            + Add secondary source
          </button>
          <button
            type="button"
            className={styles.inlineAction}
            onClick={() =>
              patchDerivedFields([
                ...derivedFields,
                {
                  as: `derived${derivedFields.length + 1}`,
                  expression: '',
                  type: 'number',
                },
              ])
            }
          >
            + Add derived field
          </button>
          {layer.type === 'flood-inundation' && (
            <button type="button" className={styles.inlineAction} onClick={applyFloodDepthPreset}>
              Use flood depth preset
            </button>
          )}
        </div>
        {secondarySources.map((source, sourceIndex) => {
          const secondaryFields = getFieldsForRefId(source.queryRefId);
          return (
            <div key={sourceIndex} className={styles.dataflowBlock}>
              <Field label="Source ID">
                <Input
                  value={source.id}
                  onChange={(e) => updateSecondarySource(sourceIndex, { id: e.currentTarget.value })}
                />
              </Field>
              <Field label="Source query">
                <Combobox
                  options={refIdOptions.filter((option) => option.value !== '')}
                  value={source.queryRefId}
                  onChange={(v) => updateSecondarySource(sourceIndex, { queryRefId: String(v.value) })}
                />
              </Field>
              <Field label="Join type">
                <Combobox
                  options={[{ label: 'Keyed ASOF', value: 'keyed-asof' }]}
                  value={source.join.type}
                  onChange={() => undefined}
                />
              </Field>
              <Field label="Local key field">
                <FieldSelect
                  value={source.join.localKeyField}
                  onChange={(v) => updateSecondarySourceJoin(sourceIndex, { localKeyField: v })}
                  availableFields={availableFields}
                />
              </Field>
              <Field label="Remote key field">
                <FieldSelect
                  value={source.join.remoteKeyField}
                  onChange={(v) => updateSecondarySourceJoin(sourceIndex, { remoteKeyField: v })}
                  availableFields={secondaryFields}
                />
              </Field>
              <Field label="Remote time field">
                <FieldSelect
                  value={source.join.timeField}
                  onChange={(v) => updateSecondarySourceJoin(sourceIndex, { timeField: v })}
                  availableFields={secondaryFields}
                />
              </Field>
              <Field label="Max lag (ms)">
                <Input
                  type="number"
                  value={source.join.maxLagMs ?? 3600000}
                  onChange={(e) => updateSecondarySourceJoin(sourceIndex, { maxLagMs: Number(e.currentTarget.value) })}
                />
              </Field>
              {source.fields.map((field, fieldIndex) => (
                <div key={fieldIndex} className={styles.dataflowRow}>
                  <Field label="Source field">
                    <FieldSelect
                      value={field.sourceField}
                      onChange={(v) => updateSecondarySourceField(sourceIndex, fieldIndex, { sourceField: v })}
                      availableFields={secondaryFields}
                    />
                  </Field>
                  <Field label="Expose as">
                    <Input
                      value={field.as}
                      onChange={(e) => updateSecondarySourceField(sourceIndex, fieldIndex, { as: e.currentTarget.value })}
                    />
                  </Field>
                  <button
                    type="button"
                    className={styles.inlineRemove}
                    onClick={() =>
                      patchSecondarySources(
                        secondarySources.map((candidate, candidateIndex) =>
                          candidateIndex === sourceIndex
                            ? { ...candidate, fields: candidate.fields.filter((_, candidateFieldIndex) => candidateFieldIndex !== fieldIndex) }
                            : candidate
                        )
                      )
                    }
                  >
                    Remove field
                  </button>
                </div>
              ))}
              <div className={styles.inlineActions}>
                <button
                  type="button"
                  className={styles.inlineAction}
                  onClick={() =>
                    updateSecondarySource(sourceIndex, {
                      fields: [...source.fields, { sourceField: '', as: '' }],
                    })
                  }
                >
                  + Add source field
                </button>
                <button
                  type="button"
                  className={styles.inlineRemove}
                  onClick={() => patchSecondarySources(secondarySources.filter((_, index) => index !== sourceIndex))}
                >
                  Remove source
                </button>
              </div>
            </div>
          );
        })}

        {derivedFields.map((derivedField, index) => (
          <div key={index} className={styles.dataflowBlock}>
            <Field label="Derived field name">
              <Input
                value={derivedField.as}
                onChange={(e) => updateDerivedField(index, { as: e.currentTarget.value })}
              />
            </Field>
            <Field label="Expression">
              <Input
                value={derivedField.expression}
                onChange={(e) => updateDerivedField(index, { expression: e.currentTarget.value })}
              />
            </Field>
            <div className={styles.tokenHelp}>
              <span className={styles.tokenLabel}>Insert:</span>
              <button type="button" className={styles.tokenButton} onClick={() => appendExpressionToken(index, 'primary.')}>
                primary.
              </button>
              {secondarySources.map((source) => (
                <button
                  key={source.id}
                  type="button"
                  className={styles.tokenButton}
                  onClick={() => appendExpressionToken(index, `${source.id}.`)}
                >
                  {source.id}.
                </button>
              ))}
              <button type="button" className={styles.tokenButton} onClick={() => appendExpressionToken(index, '-')}>
                -
              </button>
              <button type="button" className={styles.tokenButton} onClick={() => appendExpressionToken(index, '(')}>
                (
              </button>
              <button type="button" className={styles.tokenButton} onClick={() => appendExpressionToken(index, ')')}>
                )
              </button>
            </div>
            <div className={styles.sectionHint}>
              Available namespaces: `primary.*`
              {secondarySources.length > 0 ? ` and ${secondarySources.map((source) => `${source.id}.*`).join(', ')}` : ''}.
            </div>
            <button
              type="button"
              className={styles.inlineRemove}
              onClick={() => patchDerivedFields(derivedFields.filter((_, fieldIndex) => fieldIndex !== index))}
            >
              Remove derived field
            </button>
          </div>
        ))}
      </CollapsableSection>

      <CollapsableSection label="Appearance" isOpen={false}>
        <div className={styles.sectionHint}>
          {`${Math.round(layer.opacity * 100)}% opacity · visible from zoom ${layer.minZoom ?? 0} to ${layer.maxZoom ?? 24}`}
        </div>
        <Field label="Opacity">
          <Slider inputId="layer-opacity" min={0} max={1} step={0.05} value={layer.opacity} onChange={(v) => patch({ opacity: v })} />
        </Field>
        <Field label="Zoom range" description="Visible from the first zoom value through the second. Full range means no zoom limit.">
          <div className={styles.zoomRangeEditor}>
            <div className={styles.zoomRangeInputs}>
              <Input
                type="number"
                value={zoomRange[0]}
                min={DEFAULT_MIN_ZOOM}
                max={zoomRange[1]}
                onChange={(e) => patchZoomRange(parseZoomInput(e.currentTarget.value, zoomRange[0]), zoomRange[1])}
              />
              <span className={styles.zoomRangeSeparator}>to</span>
              <Input
                type="number"
                value={zoomRange[1]}
                min={zoomRange[0]}
                max={DEFAULT_MAX_ZOOM}
                onChange={(e) => patchZoomRange(zoomRange[0], parseZoomInput(e.currentTarget.value, zoomRange[1]))}
              />
              <button type="button" className={styles.zoomRangeReset} onClick={() => patchZoomRange(DEFAULT_MIN_ZOOM, DEFAULT_MAX_ZOOM)}>
                Full range
              </button>
            </div>
            <div className={styles.zoomRangeHint}>
              Visible from zoom {zoomRange[0]} through {zoomRange[1]}.
            </div>
          </div>
        </Field>
      </CollapsableSection>

      <CollapsableSection label="Color" isOpen={false}>
        <div className={styles.sectionHint}>
          {mode === 'fixed'
            ? 'Every feature uses the same color.'
            : mode === 'threshold'
              ? `Thresholds${layer.colorScale?.field ? ` based on ${layer.colorScale.field}` : ''}.`
              : `${layer.colorScale?.schemeName || 'Gradient'}${layer.colorScale?.field ? ` based on ${layer.colorScale.field}` : ''}.`}
        </div>
        <Field label="Color mode">
          <Combobox
            options={COLOR_MODES}
            value={mode}
            onChange={(v) => patch(createColorModePatch(v.value as 'fixed' | 'threshold' | 'gradient', layer, DEFAULT_VS_FILTER_COLOR))}
          />
        </Field>

        {mode === 'fixed' && (
          <Field label="Color" description="Use one color for every feature in this layer.">
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
            <Field label="Value field" description="Pick the field that drives threshold coloring.">
              <FieldSelect
                value={layer.colorScale?.field ?? ''}
                onChange={(v) => { patchColor({ field: v }); patchShader({ valueField: v }); }}
                availableFields={availableFields}
              />
            </Field>
            <Field label="Threshold preview">
              <div className={styles.thresholdSummary}>
                {(layer.colorScale?.steps ?? DEFAULT_THRESHOLD_STEPS).length} steps
              </div>
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
                      patchColor({ steps: patchThresholdStep(steps, i, { value: Number(e.currentTarget.value) }) });
                    }}
                  />
                  <div className={styles.colorPickerRow}>
                    <ColorPicker
                      color={rgbaToHex(step.color)}
                      onChange={(hex) => {
                        patchColor({ steps: patchThresholdStep(steps, i, { color: hexToRgba(hex) }) });
                      }}
                    />
                  </div>
                  <button
                    className={styles.thresholdRemove}
                    onClick={() => patchColor({ steps: removeThresholdStep(steps, i) })}
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
                patchColor({ steps: appendThresholdStep(steps) });
              }}
            >
              + Add threshold
            </button>
          </>
        )}

        {mode === 'gradient' && (
          <>
            <Field label="Value field" description="Pick the field that drives the color ramp.">
              <FieldSelect
                value={layer.colorScale?.field ?? layer.shader?.valueField ?? ''}
                onChange={(v) => { patchColor({ field: v }); patchShader({ valueField: v }); }}
                availableFields={availableFields}
              />
            </Field>
            <Field label="Color scheme">
              <Combobox
                options={SCHEME_OPTIONS.filter((o) => o.value !== '')}
                value={scheme || null}
                isClearable
                onChange={(v) => patchColor({ schemeName: v?.value || undefined })}
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
            <CollapsableSection label="Advanced color shader" isOpen={false}>
              {advancedColorOptionSections.map(([section, fields]) => (
                <CollapsableSection key={section ?? '__advanced'} label={section ?? 'Advanced'} isOpen={false}>
                  {fields.map(renderOptionField)}
                </CollapsableSection>
              ))}
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
            </CollapsableSection>
          </>
        )}
      </CollapsableSection>

      {/* ── Layer-type options (grouped by section) ── */}
      {currentRenderer && currentRenderer.optionsSchema.length > 0 &&
        regularOptionSections.map(([section, fields]) => (
          <CollapsableSection
            key={section ?? '__default'}
            label={section ? section : currentRenderer.label}
            isOpen={false}
          >
            {fields.map(renderOptionField)}
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
    sectionHint: css({
      fontSize: 12,
      color: theme.colors.text.secondary,
      marginBottom: theme.spacing(1),
      lineHeight: 1.4,
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
    thresholdSummary: css({
      fontSize: 12,
      color: theme.colors.text.secondary,
    }),
    dataflowBlock: css({
      border: `1px solid ${theme.colors.border.medium}`,
      borderRadius: theme.shape.radius.default,
      padding: theme.spacing(1),
      marginBottom: theme.spacing(1),
    }),
    dataflowRow: css({
      display: 'flex',
      flexDirection: 'column',
      gap: theme.spacing(0.5),
      marginBottom: theme.spacing(1),
    }),
    inlineActions: css({
      display: 'flex',
      gap: theme.spacing(1),
      flexWrap: 'wrap',
      marginTop: theme.spacing(0.5),
      marginBottom: theme.spacing(1),
    }),
    inlineAction: css({
      background: 'none',
      border: `1px solid ${theme.colors.border.medium}`,
      borderRadius: theme.shape.radius.default,
      color: theme.colors.text.secondary,
      cursor: 'pointer',
      fontSize: 12,
      padding: '4px 8px',
      marginBottom: theme.spacing(1),
      '&:hover': { color: theme.colors.text.primary, borderColor: theme.colors.border.strong },
    }),
    inlineRemove: css({
      background: 'none',
      border: 'none',
      color: theme.colors.text.secondary,
      cursor: 'pointer',
      fontSize: 12,
      padding: 0,
      textAlign: 'left',
      '&:hover': { color: theme.colors.error.text },
    }),
    tokenHelp: css({
      display: 'flex',
      gap: theme.spacing(0.5),
      flexWrap: 'wrap',
      alignItems: 'center',
      marginBottom: theme.spacing(0.5),
    }),
    tokenLabel: css({
      fontSize: 12,
      color: theme.colors.text.secondary,
    }),
    tokenButton: css({
      background: 'none',
      border: `1px solid ${theme.colors.border.medium}`,
      borderRadius: theme.shape.radius.default,
      color: theme.colors.text.secondary,
      cursor: 'pointer',
      fontSize: 11,
      padding: '2px 6px',
      '&:hover': { color: theme.colors.text.primary, borderColor: theme.colors.border.strong },
    }),
    zoomRangeEditor: css({
      display: 'flex',
      flexDirection: 'column',
      gap: theme.spacing(1),
    }),
    zoomRangeInputs: css({
      display: 'grid',
      gridTemplateColumns: '1fr auto 1fr',
      gap: theme.spacing(1),
      alignItems: 'center',
    }),
    zoomRangeSeparator: css({
      color: theme.colors.text.secondary,
      textAlign: 'center',
    }),
    zoomRangeReset: css({
      gridColumn: '1 / -1',
      justifySelf: 'start',
      background: 'none',
      border: `1px solid ${theme.colors.border.medium}`,
      borderRadius: theme.shape.radius.default,
      color: theme.colors.text.secondary,
      cursor: 'pointer',
      fontSize: 12,
      padding: '4px 8px',
      '&:hover': { color: theme.colors.text.primary, borderColor: theme.colors.border.strong },
    }),
    zoomRangeHint: css({
      fontSize: 12,
      color: theme.colors.text.secondary,
    }),
  };
}
