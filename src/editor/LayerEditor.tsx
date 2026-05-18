import React, { useCallback, useMemo, useState } from 'react';
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
  // type ComboboxOption,
} from '@grafana/ui';
import type { GrafanaTheme2 } from '@grafana/data';
// import type { DataSource } from '../types';
import type { LayerOptionField, LayerExtensionInstance } from '../layers/types';
import { type LayerConfig, layerDefinitions } from '../layers/_all';
import { layerExtensionDefinitions } from '../extensions';
import { FieldSelect } from './FieldSelect';
import { GeometryEditor } from './GeometryEditor';
import { TimeFilterEditor } from './TimeFilterEditor';
import { ColorScaleEditor } from './ColorScaleEditor';
import { DataEditor } from './DataEditor';
import { SelectableListEditor } from './SelectableListEditor';

// const DATA_SOURCE_OPTIONS: Array<ComboboxOption<string>> = [
//   { label: 'Grafana query', value: 'query' },
//   { label: 'GeoJSON URL', value: 'geojson-url' },
// ];

const DEFAULT_MIN_ZOOM = 0;
const DEFAULT_MAX_ZOOM = 24;

function clampZoom(value: number): number {
  return Math.max(DEFAULT_MIN_ZOOM, Math.min(DEFAULT_MAX_ZOOM, value));
}

function parseZoomInput(value: string, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? clampZoom(parsed) : fallback;
}

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
  const extensionDefs = useMemo(() => layerExtensionDefinitions, []);
  const addExtensionOptions = useMemo(
    () => extensionDefs.map((d) => ({ label: d.label, value: d.id })),
    [extensionDefs]
  );
  const [selectedExtensionIndex, setSelectedExtensionIndex] = useState<number | null>(null);
  const refIdOptions = useMemo(
    () => [{ label: 'First query', value: '' }, ...availableRefIds.map((refId) => ({ label: refId, value: refId }))],
    [availableRefIds],
  );
  const currentRenderer = useMemo(() => layerDefinitions.find((definition) => definition.type === layer.type), [layer.type]);
  const settingsRecord = layer.settings as unknown as Record<string, unknown>;

  const patch = useCallback(
    (updates: Partial<LayerConfig>) => onChange({ ...(layer as any), ...updates } as LayerConfig),
    [layer, onChange],
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

  const patchSettings = useCallback(
    (key: string, value: unknown) =>
      patch({ settings: { ...(layer.settings as any), [key]: value } } as Partial<LayerConfig>),
    [layer.settings, patch],
  );

  // const patchDataSource = useCallback(
  //   (type: DataSource['type']) => {
  //     const dataSource: DataSource = type === 'geojson-url' ? { type: 'geojson-url', url: '' } : { type: 'query' };
  //     patch({ dataSource });
  //   },
  //   [patch],
  // );

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
        opacity: layer.opacity,
        colorScale: layer.colorScale,
        showInLegend: layer.showInLegend,
        description: layer.description,
        minZoom: layer.minZoom,
        maxZoom: layer.maxZoom,
        pickable: layer.pickable,
        selectionKeyField: layer.selectionKeyField,
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
            <ColorPicker
              color={rgbaToHex((value as [number, number, number, number]) ?? [0, 0, 0, 255])}
              onChange={(hex) => onFieldChange(field.key, hexToRgba(hex))}
            />
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
        <Field label="Description">
          <TextArea value={layer.description ?? ''} onChange={(e) => patch({ description: e.currentTarget.value || undefined })} />
        </Field>
        
        <div style={{ display: 'flex', gap: '1rem' }}>
          <Field label="Visible">
            <Switch value={layer.visible} onChange={(e) => patch({ visible: e.currentTarget.checked })} />
          </Field>
          <Field label="Pickable">
            <Switch value={layer.pickable ?? true} onChange={(e) => patch({ pickable: e.currentTarget.checked })} />
          </Field>
          <Field label="Show in legend">
            <Switch value={layer.showInLegend ?? true} onChange={(e) => patch({ showInLegend: e.currentTarget.checked })} />
          </Field>
        </div>
        <Field label="Opacity">
          <Slider value={layer.opacity} min={0} max={1} step={0.01} onChange={(value) => patch({ opacity: Number(value) })} inputId="opacity" />
        </Field>

        <Field label="Zoom range">
          <div className={styles.zoomRow}>
            <Input
              value={String(layer.minZoom ?? DEFAULT_MIN_ZOOM)}
              onChange={(e) => patchZoomRange(parseZoomInput(e.currentTarget.value, layer.minZoom ?? DEFAULT_MIN_ZOOM), layer.maxZoom ?? DEFAULT_MAX_ZOOM)}
            />
            <Input
              value={String(layer.maxZoom ?? DEFAULT_MAX_ZOOM)}
              onChange={(e) => patchZoomRange(layer.minZoom ?? DEFAULT_MIN_ZOOM, parseZoomInput(e.currentTarget.value, layer.maxZoom ?? DEFAULT_MAX_ZOOM))}
            />
          </div>
        </Field>
        <Field label="Selection key field" description="Feature property used as the key for cross-panel selection on click">
          <FieldSelect
            value={layer.selectionKeyField ?? ''}
            onChange={(v) => patch({ selectionKeyField: v || undefined })}
            availableFields={availableFields}
            placeholder="None (click disabled)"
          />
        </Field>
      </CollapsableSection>

      <CollapsableSection label="Data Source" isOpen>
        <Field label="Layer type">
          <Combobox options={layerTypes} value={layer.type} onChange={(v) => v?.value && handleTypeChange(String(v.value))} />
        </Field>
        {/* <Field label="Data source">
          <Combobox
            options={DATA_SOURCE_OPTIONS}
            value={layer.dataSource?.type ?? 'query'}
            onChange={(v) => v?.value && patchDataSource(v.value as DataSource['type'])}
          />
        </Field> */}
        {/* {layer.dataSource?.type === 'geojson-url' && (
          <Field label="GeoJSON URL">
            <Input
              value={layer.dataSource.url}
              onChange={(e) => {
                const ds = layer.dataSource;
                if (ds?.type === 'geojson-url') {
                  patch({ dataSource: { ...ds, url: e.currentTarget.value } });
                }
              }}
              placeholder="https://example.com/data.geojson"
            />
          </Field>
        )} */}
        {/* {layer.dataSource?.type === 'query' && ( */}
          <Field label="Query">
            <Combobox
              options={refIdOptions}
              value={layer.queryRefId ?? ''}
              onChange={(v) => patch({ queryRefId: String(v?.value ?? '') || undefined })}
            />
          </Field>
        {/* )} */}
        <DataEditor
          derivedFields={layer.derivedFields ?? []}
          secondarySources={layer.secondarySources ?? []}
          queryRefId={layer.queryRefId}
          availableFields={availableFields}
          availableRefIds={availableRefIds}
          queryFieldsByRefId={queryFieldsByRefId}
          onDerivedFieldsChange={(derivedFields) => patch({ derivedFields })}
          onSecondarySourcesChange={(secondarySources) => patch({ secondarySources })}
        />
      </CollapsableSection>

      <CollapsableSection label="Geometry & Time" isOpen>
        <GeometryEditor
          geometry={layer.geometry}
          elevation={layer.elevation}
          availableFields={availableFields}
          onGeometryChange={(geometry) => patch({ geometry })}
          onElevationChange={(elevation) => patch({ elevation })}
        />
        <TimeFilterEditor
          timeFilter={layer.timeFilter}
          availableFields={availableFields}
          onChange={(timeFilter) => patch({ timeFilter })}
        />
      </CollapsableSection>

      {currentRenderer?.editorSections.map((editorSection) => (
        <CollapsableSection key={editorSection.title} label={editorSection.title} isOpen={true}>
          {editorSection.fields.map((field) => renderOptionField(field, settingsRecord, patchSettings))}
        </CollapsableSection>
      ))}

      <CollapsableSection label="Color" isOpen={true}>
        <ColorScaleEditor layer={layer} availableFields={availableFields} onChange={patch} />
      </CollapsableSection>

      <CollapsableSection label="Extensions" isOpen={true}>
      <SelectableListEditor<LayerExtensionInstance>
        items={layer.extensions ?? []}
        selectedIndex={selectedExtensionIndex}
        onSelect={setSelectedExtensionIndex}
        getItemKey={(item) => item.id}
        getItemLabel={(item) => extensionDefs.find((d) => d.id === item.type)?.label ?? item.type}
        addButtonLabel="Add extension"
        addOptions={addExtensionOptions}
        onAdd={(type) => {
          if (!type) return;
          const def = extensionDefs.find((d) => d.id === type);
          if (!def) return;
          const instance: LayerExtensionInstance = {
            id: `${type}-${Date.now()}`,
            type,
            config: def.createDefaults() as unknown as Record<string, unknown>,
          };
          const next = [...(layer.extensions ?? []), instance];
          patch({ extensions: next });
          setSelectedExtensionIndex(next.length - 1);
        }}
        renderEditor={(item, index) => {
          const def = extensionDefs.find((d) => d.id === item.type);
          if (!def) return null;
          return def.editorSections.map((section) => (
            <CollapsableSection key={section.title} label={section.title} isOpen>
              {section.fields.map((field) =>
                renderOptionField(field, item.config, (key, value) => {
                  const updated = (layer.extensions ?? []).map((ext, i) =>
                    i === index ? { ...ext, config: { ...ext.config, [key]: value } } : ext
                  );
                  patch({ extensions: updated });
                })
              )}
            </CollapsableSection>
          ));
        }}
        onRemove={(index) => {
          patch({ extensions: (layer.extensions ?? []).filter((_, i) => i !== index) });
          if (selectedExtensionIndex === index) {
            setSelectedExtensionIndex(null);
          } else if (selectedExtensionIndex !== null && selectedExtensionIndex > index) {
            setSelectedExtensionIndex(selectedExtensionIndex - 1);
          }
        }}
      />
      </CollapsableSection>
    </div>
  );
}

function getStyles(theme: GrafanaTheme2) {
  return {
    root: css({ display: 'flex', flexDirection: 'column', gap: theme.spacing(1), padding: theme.spacing(1) }),
    zoomRow: css({ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: theme.spacing(1) }),
  };
}
