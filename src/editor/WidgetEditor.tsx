import React, { useCallback, useMemo } from 'react';
import { css } from '@emotion/css';
import { useStyles2, Input, Switch, Combobox, Field, CollapsableSection, ColorPicker } from '@grafana/ui';
import type { GrafanaTheme2 } from '@grafana/data';
import type { LayerOptionField } from '../layers/types';
import { widgetDefinitions, type WidgetConfig } from '../widgets/_all';

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
  widget: WidgetConfig;
  onChange: (widget: WidgetConfig) => void;
}

export function WidgetEditor({ widget, onChange }: Props) {
  const styles = useStyles2(getStyles);
  const widgetTypes = useMemo(
    () => widgetDefinitions.map((d) => ({ label: d.label, value: d.type, description: d.description })),
    []
  );
  const currentDefinition = useMemo(() => widgetDefinitions.find((d) => d.type === widget.type), [widget.type]);
  const settingsRecord = widget.settings as unknown as Record<string, unknown>;

  const patch = useCallback(
    (updates: Partial<WidgetConfig>) => onChange({ ...(widget as any), ...updates } as WidgetConfig),
    [widget, onChange],
  );

  const patchSettings = useCallback(
    (key: string, value: unknown) =>
      patch({ settings: { ...(widget.settings as any), [key]: value } } as Partial<WidgetConfig>),
    [widget.settings, patch],
  );

  const handleTypeChange = useCallback(
    (type: string) => {
      const definition = widgetDefinitions.find((d) => d.type === type);
      if (!definition) {
        return;
      }
      const next = definition.createDefaultConfig(0);
      onChange({ ...next, id: widget.id, label: widget.label, visible: widget.visible } as WidgetConfig);
    },
    [widget, onChange],
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
    [],
  );

  return (
    <div className={styles.root}>
        <Field label="Widget type">
          <Combobox
            options={widgetTypes}
            value={widget.type || null}
            onChange={(v) => v?.value && handleTypeChange(String(v.value))}
          />
        </Field>
      {/* <CollapsableSection label="General" isOpen> */}
        {/* <Field label="Visible">
          <Switch value={widget.visible} onChange={(e) => patch({ visible: e.currentTarget.checked })} />
        </Field> */}
      {/* </CollapsableSection> */}

      {currentDefinition?.editorSections.map((section) => (
        <CollapsableSection key={section.title} label={''} isOpen>
          {section.fields.map((field) => renderOptionField(field, settingsRecord, patchSettings))}
        </CollapsableSection>
      ))}
    </div>
  );
}

function getStyles(theme: GrafanaTheme2) {
  return {
    root: css({ display: 'flex', flexDirection: 'column', gap: theme.spacing(1), padding: theme.spacing(1) }),
  };
}
