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
} from '@grafana/ui';
import type { GrafanaTheme2 } from '@grafana/data';
import type { LayerOptionField, LayerExtensionInstance } from '../layers/types';
import type { SourceRef } from '../types';
import * as layerRegistry from '../layers';
import type { LayerConfig, LayerType } from '../layers';
import { layerExtensionDefinitions } from '../extensions';
import { GeometryEditor } from './sections/GeometryEditor';
import { ColorScaleEditor } from './utils/ColorScaleEditor';
import { DataEditor } from './sections/DataEditor';
import { SelectableListEditor } from './utils/SelectableListEditor';
import { useSelectableListState } from './utils/useSelectableListState';
import { SourceRefEditor } from './utils/SourceRefEditor';
import { DEFAULT_SELECTED_COLOR } from '../layers/utils';

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

interface SourceOption {
  id: string;
  label: string;
}

interface Props {
  layer: LayerConfig;
  onChange: (layer: LayerConfig) => void;
  availableRefIds?: string[];
  queryFieldsByRefId?: Record<string, string[]>;
  sourceOptions?: SourceOption[];
  fieldsBySource?: Record<string, string[]>;
  featureSourceOptions?: SourceOption[];
  featureFieldsBySource?: Record<string, string[]>;
}

export function LayerEditor({
  layer,
  onChange,
  availableRefIds = [],
  queryFieldsByRefId = {},
  sourceOptions = [],
  fieldsBySource = {},
  featureSourceOptions = [],
  featureFieldsBySource = {},
}: Props) {
  const styles = useStyles2(getStyles);
  const layerTypes = useMemo(() => layerRegistry.layerDefinitions.map((r) => ({ label: r.label, value: r.type })), []);
  const extensionDefs = useMemo(() => layerExtensionDefinitions, []);
  const addExtensionOptions = useMemo(
    () => extensionDefs.map((d) => ({ label: d.label, value: d.id })),
    [extensionDefs]
  );
  const currentRenderer = useMemo(
    () => layerRegistry.getLayerDefinition?.(layer.type) ?? layerRegistry.layerDefinitions.find((definition) => definition.type === layer.type),
    [layer.type]
  );
  const settingsRecord = layer.settings as unknown as Record<string, unknown>;

  const patch = useCallback(
    (updates: Partial<LayerConfig>) => onChange({ ...layer, ...updates } as LayerConfig),
    [layer, onChange],
  );
  const {
    selectedIndex: selectedExtensionIndex,
    setSelectedIndex: setSelectedExtensionIndex,
    addItem: addExtensionItem,
    patchAt: patchExtension,
    removeAt: removeExtension,
  } = useSelectableListState({
    items: layer.extensions ?? [],
    onChange: (next) => patch({ extensions: next }),
  });

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
      patch({ settings: { ...settingsRecord, [key]: value } as unknown as LayerConfig['settings'] } as Partial<LayerConfig>),
    [patch, settingsRecord],
  );

  const handleTypeChange = useCallback(
    (type: LayerType) => {
      const definition = layerRegistry.getLayerDefinition?.(type) ?? layerRegistry.layerDefinitions.find((item) => item.type === type);
      if (!definition) {
        return;
      }
      const next = definition.createDefaultConfig(0);
      onChange({
        ...next,
        id: layer.id,
        label: layer.label,
        visible: layer.visible,
        data: layer.data,
        geometry: layer.geometry,
        timeFilter: layer.timeFilter,
        opacity: layer.opacity,
        colorScale: layer.colorScale,
        showInLegend: layer.showInLegend,
        description: layer.description,
        minZoom: layer.minZoom,
        maxZoom: layer.maxZoom,
        pickable: layer.pickable,
        selectionKey: layer.selectionKey,
        selectionColor: layer.selectionColor,
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
      if (field.type === 'fieldPicker' || field.type === 'sourceRef') {
        return (
          <Field key={field.key} label={field.label}>
            <SourceRefEditor
              value={value as SourceRef | undefined}
              onChange={(next) => onFieldChange(field.key, next)}
              sourceOptions={sourceOptions}
              fieldsBySource={fieldsBySource}
            />
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
    [fieldsBySource, sourceOptions],
  );

  return (
    <div className={styles.root}>
      <CollapsableSection label="General" isOpen>
        <Field label="Layer name">
          <Input value={layer.label} onChange={(e) => patch({ label: e.currentTarget.value })} />
        </Field>
        <Field label="Layer type">
          <Combobox options={layerTypes} value={layer.type} onChange={(v) => v?.value && handleTypeChange(String(v.value) as LayerType)} />
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
        <Field label="Selection color">
          <ColorPicker
            color={rgbaToHex(layer.selectionColor ?? DEFAULT_SELECTED_COLOR)}
            onChange={(hex) => patch({ selectionColor: hexToRgba(hex) })}
          />
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
      </CollapsableSection>

      <CollapsableSection label="Feature Source" isOpen>
        <DataEditor
          data={layer.data}
          derivedFields={layer.derivedFields ?? []}
          timeFilter={layer.timeFilter}
          availableRefIds={availableRefIds}
          queryFieldsByRefId={queryFieldsByRefId}
          featureSourceFields={featureFieldsBySource[layer.data.featureSource.id] ?? []}
          onDataChange={(data) => patch({ data })}
          onDerivedFieldsChange={(derivedFields) => patch({ derivedFields })}
          onTimeFilterChange={(timeFilter) => patch({ timeFilter })}
        />
      </CollapsableSection>

      <CollapsableSection label="Geometry" isOpen>
        <GeometryEditor
          geometry={layer.geometry}
          sourceOptions={featureSourceOptions}
          fieldsBySource={featureFieldsBySource}
          onGeometryChange={(geometry) => patch({ geometry })}
        />
      </CollapsableSection>

      <CollapsableSection label="Selection" isOpen>
        <Field label="Selection key" description="Feature property used as the key for cross-panel selection on click">
          <SourceRefEditor
            value={layer.selectionKey}
            onChange={(selectionKey) => patch({ selectionKey })}
            sourceOptions={featureSourceOptions}
            fieldsBySource={featureFieldsBySource}
            placeholder="None (click disabled)"
          />
        </Field>
      </CollapsableSection>

      {currentRenderer?.editorSections.map((editorSection) => (
        <CollapsableSection key={editorSection.title} label={editorSection.title} isOpen={true}>
          {editorSection.fields.map((field) => renderOptionField(field, settingsRecord, patchSettings))}
        </CollapsableSection>
      ))}

      <CollapsableSection label="Color" isOpen={true}>
        <ColorScaleEditor layer={layer} sourceOptions={sourceOptions} fieldsBySource={fieldsBySource} onChange={patch} />
      </CollapsableSection>

      <CollapsableSection label="Advanced" isOpen={true}>
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
            addExtensionItem({
              id: `${type}-${Date.now()}`,
              type,
              config: def.createDefaults() as unknown as Record<string, unknown>,
            });
          }}
          renderEditor={(item, index) => {
            const def = extensionDefs.find((d) => d.id === item.type);
            if (!def) return null;
            return def.editorSections.map((section) => (
              <CollapsableSection key={section.title} label={section.title} isOpen>
                {section.fields.map((field) =>
                  renderOptionField(field, item.config, (key, value) => {
                    patchExtension(index, { config: { ...item.config, [key]: value } });
                  })
                )}
              </CollapsableSection>
            ));
          }}
          onRemove={removeExtension}
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
