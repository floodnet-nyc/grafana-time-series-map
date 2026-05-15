import React, { useCallback } from 'react';
import { css } from '@emotion/css';
import { useStyles2, Field, Button, Combobox, Input, TextArea, type ComboboxOption } from '@grafana/ui';
import type { GrafanaTheme2 } from '@grafana/data';
import type { LayerDerivedFieldConfig, LayerSecondarySourceConfig } from '../types';
import { FieldSelect } from './FieldSelect';

const DERIVED_FIELD_TYPES: Array<ComboboxOption<string>> = [
  { label: 'Number', value: 'number' },
  { label: 'String', value: 'string' },
  { label: 'Boolean', value: 'boolean' },
];

function getDefaultSecondarySource(primaryQueryRefId: string | undefined, availableRefIds: string[]): LayerSecondarySourceConfig {
  const preferredQueryRefId = availableRefIds.find((refId) => refId !== primaryQueryRefId) ?? availableRefIds[0] ?? '';
  return {
    queryRefId: preferredQueryRefId,
    join: { type: 'keyed-asof', localKeyField: '', remoteKeyField: '', timeField: '', maxLagMs: 3600000 },
    fields: [{ sourceField: '' }],
  };
}

interface Props {
  derivedFields: LayerDerivedFieldConfig[];
  secondarySources: LayerSecondarySourceConfig[];
  queryRefId?: string;
  availableFields: string[];
  availableRefIds: string[];
  queryFieldsByRefId: Record<string, string[]>;
  onDerivedFieldsChange: (fields: LayerDerivedFieldConfig[]) => void;
  onSecondarySourcesChange: (sources: LayerSecondarySourceConfig[]) => void;
}

export function DataEditor({
  derivedFields,
  secondarySources,
  queryRefId,
  availableFields,
  availableRefIds,
  queryFieldsByRefId,
  onDerivedFieldsChange,
  onSecondarySourcesChange,
}: Props) {
  const styles = useStyles2(getStyles);
  const refIdOptions = [
    { label: 'First query', value: '' },
    ...availableRefIds.map((refId) => ({ label: refId, value: refId })),
  ];

  const getFieldsForRefId = useCallback(
    (refId: string | undefined) => (refId ? queryFieldsByRefId[refId] ?? [] : []),
    [queryFieldsByRefId],
  );

  return (
    <>
      <Field label="Derived fields">
        <Button
          size="sm"
          variant="secondary"
          onClick={() => onDerivedFieldsChange([...derivedFields, { as: '', expression: '', type: 'number' }])}
        >
          Add derived field
        </Button>
      </Field>
      {derivedFields.map((field, index) => (
        <div key={`derived-${index}`} className={styles.card}>
          <Field label="Name">
            <Input
              value={field.as}
              onChange={(e) =>
                onDerivedFieldsChange(derivedFields.map((item, i) => (i === index ? { ...item, as: e.currentTarget.value } : item)))
              }
            />
          </Field>
          <Field label="Expression">
            <TextArea
              value={field.expression}
              onChange={(e) =>
                onDerivedFieldsChange(derivedFields.map((item, i) => (i === index ? { ...item, expression: e.currentTarget.value } : item)))
              }
            />
          </Field>
          <Field label="Type">
            <Combobox
              options={DERIVED_FIELD_TYPES}
              value={field.type ?? 'number'}
              onChange={(v) =>
                onDerivedFieldsChange(
                  derivedFields.map((item, i) =>
                    i === index ? { ...item, type: v?.value as 'number' | 'string' | 'boolean' } : item,
                  ),
                )
              }
            />
          </Field>
          <Button size="sm" variant="destructive" onClick={() => onDerivedFieldsChange(derivedFields.filter((_, i) => i !== index))}>
            Remove derived field
          </Button>
        </div>
      ))}

      <Field label="Secondary sources">
        <Button
          size="sm"
          variant="secondary"
          onClick={() => onSecondarySourcesChange([...secondarySources, getDefaultSecondarySource(queryRefId, availableRefIds)])}
        >
          Add secondary source
        </Button>
      </Field>
      {secondarySources.map((source, index) => {
        const sourceFields = getFieldsForRefId(source.queryRefId);
        const patchSource = (updates: Partial<LayerSecondarySourceConfig>) =>
          onSecondarySourcesChange(secondarySources.map((item, i) => (i === index ? { ...item, ...updates } : item)));
        const patchJoin = (updates: Partial<LayerSecondarySourceConfig['join']>) =>
          patchSource({ join: { ...source.join, ...updates } });

        return (
          <div key={source.queryRefId || index} className={styles.card}>
            <Field label="Query">
              <Combobox
                options={refIdOptions}
                value={source.queryRefId}
                onChange={(v) => patchSource({ queryRefId: String(v?.value ?? '') })}
              />
            </Field>
            <Field label="Local key field">
              <FieldSelect value={source.join.localKeyField} onChange={(v) => patchJoin({ localKeyField: v })} availableFields={availableFields} />
            </Field>
            <Field label="Remote key field">
              <FieldSelect value={source.join.remoteKeyField} onChange={(v) => patchJoin({ remoteKeyField: v })} availableFields={sourceFields} />
            </Field>
            <Field label="Time field">
              <FieldSelect value={source.join.timeField} onChange={(v) => patchJoin({ timeField: v })} availableFields={sourceFields} />
            </Field>
            <Field label="Max lag (ms)">
              <Input
                type="number"
                value={String(source.join.maxLagMs ?? 3600000)}
                onChange={(e) => patchJoin({ maxLagMs: Number(e.currentTarget.value) })}
              />
            </Field>
            <Field label="Source fields">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => patchSource({ fields: [...source.fields, { sourceField: '' }] })}
              >
                Add source field
              </Button>
            </Field>
            {source.fields.map((mappedField, fieldIndex) => (
              <div key={`${source.queryRefId || index}-field-${fieldIndex}`} className={styles.nestedCard}>
                <Field label="Source field">
                  <FieldSelect
                    value={mappedField.sourceField}
                    onChange={(v) =>
                      patchSource({
                        fields: source.fields.map((f, j) => (j === fieldIndex ? { ...f, sourceField: v } : f)),
                      })
                    }
                    availableFields={sourceFields}
                  />
                </Field>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => patchSource({ fields: source.fields.filter((_, j) => j !== fieldIndex) })}
                >
                  Remove source field
                </Button>
              </div>
            ))}
            <Button
              size="sm"
              variant="destructive"
              onClick={() => onSecondarySourcesChange(secondarySources.filter((_, i) => i !== index))}
            >
              Remove secondary source
            </Button>
          </div>
        );
      })}
    </>
  );
}

function getStyles(theme: GrafanaTheme2) {
  return {
    card: css({
      border: `1px solid ${theme.colors.border.weak}`,
      padding: theme.spacing(1),
      borderRadius: theme.shape.radius.default,
      marginBottom: theme.spacing(1),
    }),
    nestedCard: css({
      border: `1px solid ${theme.colors.border.weak}`,
      padding: theme.spacing(1),
      borderRadius: theme.shape.radius.default,
      marginBottom: theme.spacing(1),
    }),
  };
}
