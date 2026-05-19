import React, { useCallback } from 'react';
import { css } from '@emotion/css';
import { useStyles2, Field, Combobox, MultiCombobox, Input, TextArea, type ComboboxOption } from '@grafana/ui';
import type { GrafanaTheme2 } from '@grafana/data';
import type { JoinedSourceConfig, LayerDataConfig, LayerDerivedFieldConfig } from '../types';
import { createSourceRef, DEFAULT_FEATURE_SOURCE_ID } from '../layers/defaults';
import { SourceRefEditor } from './SourceRefEditor';
import { SelectableListEditor } from './SelectableListEditor';
import { useSelectableListState } from './useSelectableListState';

const DERIVED_FIELD_TYPES: Array<ComboboxOption<string>> = [
  { label: 'Number', value: 'number' },
  { label: 'String', value: 'string' },
  { label: 'Boolean', value: 'boolean' },
];

function getDefaultJoinedSource(featureSourceId: string, featureSourceRefId: string | undefined, availableRefIds: string[]): JoinedSourceConfig {
  const preferredRefId = availableRefIds.find((refId) => refId !== featureSourceRefId) ?? availableRefIds[0] ?? '';
  const id = `source-${Date.now()}`;
  return {
    id,
    refId: preferredRefId,
    join: { type: 'keyed-asof', localKey: createSourceRef('', featureSourceId), remoteKey: '', time: '', maxLagMs: 3600000 },
    fields: [],
  };
}

interface Props {
  data: LayerDataConfig;
  derivedFields: LayerDerivedFieldConfig[];
  availableRefIds: string[];
  queryFieldsByRefId: Record<string, string[]>;
  featureSourceFields: string[];
  onDataChange: (data: LayerDataConfig) => void;
  onDerivedFieldsChange: (fields: LayerDerivedFieldConfig[]) => void;
}

function JoinedSourceEditor({
  source,
  featureSourceId,
  featureSourceFields,
  availableRefIds,
  queryFieldsByRefId,
  patchSource,
}: {
  source: JoinedSourceConfig;
  featureSourceId: string;
  featureSourceFields: string[];
  availableRefIds: string[];
  queryFieldsByRefId: Record<string, string[]>;
  patchSource: (updates: Partial<JoinedSourceConfig>) => void;
}) {
  const sourceFields = source.refId ? queryFieldsByRefId[source.refId] ?? [] : [];
  const refIdOptions = [
    { label: 'First query', value: '' },
    ...availableRefIds.map((refId) => ({ label: refId, value: refId })),
  ];

  const patchJoin = (updates: Partial<JoinedSourceConfig['join']>) => patchSource({ join: { ...source.join, ...updates } });

  return (
    <>
      <Field label="Source id">
        <Input value={source.id} onChange={(e) => patchSource({ id: e.currentTarget.value })} />
      </Field>
      <Field label="Query">
        <Combobox
          options={refIdOptions}
          value={source.refId}
          onChange={(v) => patchSource({ refId: String(v?.value ?? '') })}
        />
      </Field>
      <Field label="Local key">
        <SourceRefEditor
          value={source.join.localKey}
          onChange={(value) => patchJoin({ localKey: value })}
          sourceOptions={[{ id: featureSourceId, label: featureSourceId === DEFAULT_FEATURE_SOURCE_ID ? 'Feature source' : featureSourceId }]}
          fieldsBySource={{ [featureSourceId]: featureSourceFields }}
        />
      </Field>
      <Field label="Remote key">
        <Combobox
          options={sourceFields.map((field) => ({ label: field, value: field }))}
          value={source.join.remoteKey || null}
          onChange={(v) => patchJoin({ remoteKey: String(v?.value ?? '') })}
          isClearable
          createCustomValue
        />
      </Field>
      <Field label="Join time">
        <Combobox
          options={sourceFields.map((field) => ({ label: field, value: field }))}
          value={source.join.time || null}
          onChange={(v) => patchJoin({ time: String(v?.value ?? '') })}
          isClearable
          createCustomValue
        />
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
          options={sourceFields.map((field) => ({ label: field, value: field }))}
          value={source.fields.map((field) => field.field)}
          onChange={(values) =>
            patchSource({
              fields: values.map((value) => ({ field: String(value) })),
            })
          }
        />
      </Field>
    </>
  );
}

function DerivedFieldEditor({
  field,
  patchField,
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
  data,
  derivedFields,
  availableRefIds,
  queryFieldsByRefId,
  featureSourceFields,
  onDataChange,
  onDerivedFieldsChange,
}: Props) {
  const styles = useStyles2(getStyles);
  const joinedSources = data.joinedSources ?? [];
  const {
    selectedIndex: selectedJoinedSourceIndex,
    setSelectedIndex: setSelectedJoinedSourceIndex,
    patchAt: patchJoinedSource,
    addItem: addJoinedSourceItem,
    removeAt: removeJoinedSource,
    moveAt: moveJoinedSource,
  } = useSelectableListState({
    items: joinedSources,
    onChange: (next) => onDataChange({ ...data, joinedSources: next }),
  });
  const {
    selectedIndex: selectedDerivedFieldIndex,
    setSelectedIndex: setSelectedDerivedFieldIndex,
    patchAt: patchDerivedField,
    addItem: addDerivedFieldItem,
    removeAt: removeDerivedField,
    moveAt: moveDerivedField,
  } = useSelectableListState({
    items: derivedFields,
    onChange: onDerivedFieldsChange,
  });

  const addJoinedSource = useCallback(() => {
    addJoinedSourceItem(getDefaultJoinedSource(data.featureSource.id, data.featureSource.refId, availableRefIds));
  }, [addJoinedSourceItem, availableRefIds, data.featureSource.id, data.featureSource.refId]);

  const addDerivedField = useCallback(() => {
    addDerivedFieldItem({ as: '', expression: '', type: 'number' });
  }, [addDerivedFieldItem]);

  const refIdOptions = [
    { label: 'First query', value: '' },
    ...availableRefIds.map((refId) => ({ label: refId, value: refId })),
  ];

  return (
    <>
      <Field label="Feature Source">
        <Combobox
          options={refIdOptions}
          value={data.featureSource.refId}
          onChange={(v) =>
            onDataChange({
              ...data,
              featureSource: {
                ...data.featureSource,
                refId: String(v?.value ?? ''),
              },
            })
          }
        />
      </Field>
      <Field label="Joined Sources">
        <SelectableListEditor
          items={joinedSources}
          selectedIndex={selectedJoinedSourceIndex}
          onSelect={setSelectedJoinedSourceIndex}
          getItemKey={(source, index) => `${source.id}-${index}`}
          getItemLabel={(source, index) => source.id || `Joined source ${index + 1}`}
          addButtonLabel="Add joined source"
          onAdd={addJoinedSource}
          onMove={moveJoinedSource}
          onRemove={removeJoinedSource}
          renderEditor={(source, index) => (
            <div className={styles.card}>
              <JoinedSourceEditor
                source={source}
                featureSourceId={data.featureSource.id}
                featureSourceFields={featureSourceFields}
                availableRefIds={availableRefIds}
                queryFieldsByRefId={queryFieldsByRefId}
                patchSource={(updates) => patchJoinedSource(index, updates)}
              />
            </div>
          )}
        />
      </Field>
      <Field label="Derived Fields">
        <SelectableListEditor
          items={derivedFields}
          selectedIndex={selectedDerivedFieldIndex}
          onSelect={setSelectedDerivedFieldIndex}
          getItemKey={(field, index) => `${field.as || 'derived-field'}-${index}`}
          getItemLabel={(field, index) => field.as || `Derived field ${index + 1}`}
          addButtonLabel="Add derived field"
          onAdd={addDerivedField}
          onMove={moveDerivedField}
          onRemove={removeDerivedField}
          renderEditor={(field, index) => (
            <div className={styles.card}>
              <DerivedFieldEditor field={field} patchField={(updates) => patchDerivedField(index, updates)} />
            </div>
          )}
        />
      </Field>
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
