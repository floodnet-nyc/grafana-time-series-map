import React, { useCallback } from 'react';
import { css } from '@emotion/css';
import { useStyles2, Field, Button, Combobox, MultiCombobox, Input, TextArea, type ComboboxOption } from '@grafana/ui';
import type { GrafanaTheme2 } from '@grafana/data';
import type { LayerDerivedFieldConfig, LayerSecondarySourceConfig } from '../types';
import { FieldSelect } from './FieldSelect';
import { SelectableListEditor } from './SelectableListEditor';
import { useSelectableListState } from './useSelectableListState';

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

export function JoinSourceEditor({
  source, availableFields, availableRefIds, queryFieldsByRefId, patchSource,
}: {
  source: LayerSecondarySourceConfig;
  index: number;
  secondarySources: LayerSecondarySourceConfig[];
  availableFields: string[];
  availableRefIds: string[];
  queryFieldsByRefId: Record<string, string[]>;
  patchSource: (updates: Partial<LayerSecondarySourceConfig>) => void;
}) {
  const sourceFields = source.queryRefId ? queryFieldsByRefId[source.queryRefId] ?? [] : [];
  const refIdOptions = [
    { label: 'First query', value: '' },
    ...availableRefIds.map((refId) => ({ label: refId, value: refId })),
  ];

  const patchJoin = (updates: Partial<LayerSecondarySourceConfig['join']>) => patchSource({ join: { ...source.join, ...updates } });

  return (
    <>
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
        <MultiCombobox
          options={sourceFields.map((f) => ({ label: f, value: f }))}
          value={source.fields.map((f) => f.sourceField)}
          onChange={(v) =>
            patchSource({
              fields: v.map((value) => ({ sourceField: String(value) })),
            })
          }
        />
      </Field>
    </>
  );
}

export function DerivedFieldEditor({
  field, patchField,
}: {
  field: LayerDerivedFieldConfig;
  patchField: (updates: Partial<LayerDerivedFieldConfig>) => void;
}) {
  return (
    <>
      <Field label="Name">
        <Input value={field.as} onChange={(e) => patchField({ as: e.currentTarget.value })} />
      </Field>
      <Field label="Expression">
        <TextArea value={field.expression} onChange={(e) => patchField({ expression: e.currentTarget.value })} />
      </Field>
      <Field label="Type">
        <Combobox
          options={DERIVED_FIELD_TYPES}
          value={field.type ?? 'number'}
          onChange={(v) => patchField({ type: v?.value as 'number' | 'string' | 'boolean' })}
        />
      </Field>
    </>
  );
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
  const {
    selectedIndex: selectedSecondarySourceIndex,
    setSelectedIndex: setSelectedSecondarySourceIndex,
    patchAt: patchSecondarySource,
    addItem: addSecondarySourceItem,
    removeAt: removeSecondarySource,
    moveAt: moveSecondarySource,
  } = useSelectableListState({
    items: secondarySources,
    onChange: onSecondarySourcesChange,
  });

  const addSecondarySource = useCallback(() => {
    addSecondarySourceItem(getDefaultSecondarySource(queryRefId, availableRefIds));
  }, [addSecondarySourceItem, availableRefIds, queryRefId]);

  return (
    <>
      <Field label="Secondary sources">
        <SelectableListEditor
          items={secondarySources}
          selectedIndex={selectedSecondarySourceIndex}
          onSelect={setSelectedSecondarySourceIndex}
          getItemKey={(source, index) => `${source.queryRefId || 'first-query'}-${index}`}
          getItemLabel={(source, index) => source.queryRefId || `First query source ${index + 1}`}
          addButtonLabel="Add secondary source"
          onAdd={addSecondarySource}
          onMove={moveSecondarySource}
          onRemove={removeSecondarySource}
          renderEditor={(source, index) => (
            <div className={styles.card}>
              <JoinSourceEditor
                source={source}
                index={index}
                secondarySources={secondarySources}
                availableFields={availableFields}
                availableRefIds={availableRefIds}
                queryFieldsByRefId={queryFieldsByRefId}
                patchSource={(updates) => patchSecondarySource(index, updates)}
              />
            </div>
          )}
        />
      </Field>
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
          <DerivedFieldEditor
            field={field}
            patchField={(updates) =>
              onDerivedFieldsChange(derivedFields.map((item, i) => (i === index ? { ...item, ...updates } : item)))
            }
          />
        </div>
      ))}
    </>
  );
}

function getStyles(theme: GrafanaTheme2) {
  return {
    card: css({
      padding: theme.spacing(1),
    }),
  };
}
