import React, { useCallback, useMemo } from 'react';
import { Field, Combobox, MultiCombobox, Input, TextArea, Switch, type ComboboxOption } from '@grafana/ui';
import type { FeatureSourceConfig, JoinedSourceConfig, LayerDataConfig, LayerDerivedFieldConfig, TimeFilterConfig } from '../types';
import { createSourceRef, DEFAULT_FEATURE_SOURCE_ID } from '../layers/defaults';
import { SourceRefEditor } from './utils/SourceRefEditor';
import { SelectableListEditor } from './utils/SelectableListEditor';
import { useSelectableListState } from './utils/useSelectableListState';

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
    join: { type: 'asof', localKey: createSourceRef('', featureSourceId), remoteKey: '', time: '', maxLagMs: 3600000 },
    fields: [],
  };
}

interface Props {
  data: LayerDataConfig;
  derivedFields: LayerDerivedFieldConfig[];
  timeFilter: TimeFilterConfig;
  availableRefIds: string[];
  queryFieldsByRefId: Record<string, string[]>;
  featureSourceFields: string[];
  onDataChange: (data: LayerDataConfig) => void;
  onDerivedFieldsChange: (fields: LayerDerivedFieldConfig[]) => void;
  onTimeFilterChange: (timeFilter: TimeFilterConfig) => void;
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
      <Field label={`Local Key (${featureSourceId})`}>
        <SourceRefEditor
          value={source.join.localKey}
          onChange={(value) => patchJoin({ localKey: value })}
          sourceOptions={[{ id: featureSourceId, label: featureSourceId === DEFAULT_FEATURE_SOURCE_ID ? 'Feature source' : featureSourceId }]}
          fieldsBySource={{ [featureSourceId]: featureSourceFields }}
        />
      </Field>
      <Field label={`Remote Key (${source.refId || 'query'})`}>
        <SourceRefEditor
          value={source.join.remoteKey}
          onChange={(value) => patchJoin({ remoteKey: value.field })}
          sourceOptions={[{ id: source.refId || 'query', label: source.refId || 'Query' }]}
          fieldsBySource={{ [source.refId || 'query']: sourceFields }}
          sourceId={source.refId || 'query'}
        />
      </Field>
      <Field label="Join time">
        <SourceRefEditor
          value={source.join.time}
          onChange={(value) => patchJoin({ time: value.field })}
          sourceOptions={[{ id: source.refId || 'query', label: source.refId || 'Query' }]}
          fieldsBySource={{ [source.refId || 'query']: sourceFields }}
          sourceId={source.refId || 'query'}
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

function FeatureSourceEditor({
  featureSource,
  timeFilter,
  featureSourceFields,
  availableRefIds,
  patchFeatureSource,
  onTimeFilterChange,
}: {
  featureSource: FeatureSourceConfig;
  timeFilter: TimeFilterConfig;
  featureSourceFields: string[];
  availableRefIds: string[];
  patchFeatureSource: (updates: Partial<FeatureSourceConfig>) => void;
  onTimeFilterChange: (timeFilter: TimeFilterConfig) => void;
}) {
  const refIdOptions = [
    { label: 'First query', value: '' },
    ...availableRefIds.map((refId) => ({ label: refId, value: refId })),
  ];
  const geotemporal = timeFilter.mode === 'asof';
  const sourceOptions = [{ id: featureSource.id, label: featureSource.id === DEFAULT_FEATURE_SOURCE_ID ? 'Feature source' : featureSource.id }];

  const patchTimeFilter = (updates: Partial<TimeFilterConfig>) => onTimeFilterChange({ ...timeFilter, ...updates });

  return (
    <>
      <Field label="Query">
        <Combobox
          options={refIdOptions}
          value={featureSource.refId}
          onChange={(v) => patchFeatureSource({ refId: String(v?.value ?? '') })}
        />
      </Field>
      <Field label="Has time field" description="Whether to enable geotemporal filtering. If time series data comes from a joined source, leave this disabled and configure the time field on the joined source instead.">
        <Switch
          value={geotemporal}
          onChange={(e) =>
            onTimeFilterChange(
              e.currentTarget.checked
                ? {
                    mode: 'asof',
                    time: timeFilter.time ?? createSourceRef('', featureSource.id),
                    groupBy: timeFilter.groupBy ?? createSourceRef('', featureSource.id),
                    maxLagMs: timeFilter.maxLagMs ?? 3600000,
                  }
                : { mode: 'none' }
            )
          }
        />
      </Field>
      {geotemporal ? (
        <>
          <Field label="Time field">
            <SourceRefEditor
              value={timeFilter.time?.field}
              onChange={(value) => patchTimeFilter({ time: value })}
              sourceOptions={sourceOptions}
              fieldsBySource={{ [featureSource.id]: featureSourceFields }}
              sourceId={featureSource.id}
            />
          </Field>
          <Field label="Group-by field">
            <SourceRefEditor
              value={timeFilter.groupBy?.field}
              onChange={(value) => patchTimeFilter({ groupBy: value })}
              sourceOptions={sourceOptions}
              fieldsBySource={{ [featureSource.id]: featureSourceFields }}
              sourceId={featureSource.id}
            />
          </Field>
          <Field label="Max lag (ms)">
            <Input
              type="number"
              value={String(timeFilter.maxLagMs ?? 3600000)}
              onChange={(e) => patchTimeFilter({ maxLagMs: Number(e.currentTarget.value) })}
            />
          </Field>
        </>
      ) : null}
    </>
  );
}

export function JoinedSourceListEditor({
  sources,
  featureSourceId,
  featureSourceFields,
  availableRefIds,
  queryFieldsByRefId,
  onChange,
}: {
  sources: JoinedSourceConfig[];
  featureSourceId: string;
  featureSourceFields: string[];
  availableRefIds: string[];
  queryFieldsByRefId: Record<string, string[]>;
  onChange: (sources: JoinedSourceConfig[]) => void;
}) {
  const { selectedIndex, setSelectedIndex, patchAt, addItem, removeAt, moveAt } = useSelectableListState({ items: sources, onChange });

  const addJoinedSource = useCallback(() => {
    addItem(getDefaultJoinedSource(featureSourceId, undefined, availableRefIds));
  }, [addItem, availableRefIds, featureSourceId]);

  return (
    <SelectableListEditor
      items={sources}
      selectedIndex={selectedIndex}
      onSelect={setSelectedIndex}
      getItemKey={(source, index) => `${source.id}-${index}`}
      getItemLabel={(source, index) => source.id || `Joined source ${index + 1}`}
      addButtonLabel="Add joined source"
      onAdd={addJoinedSource}
      onMove={moveAt}
      onRemove={removeAt}
      renderEditor={(source, index) => (
        <div>
          <JoinedSourceEditor
            source={source}
            featureSourceId={featureSourceId}
            featureSourceFields={featureSourceFields}
            availableRefIds={availableRefIds}
            queryFieldsByRefId={queryFieldsByRefId}
            patchSource={(updates) => patchAt(index, { ...source, ...updates })}
          />
        </div>
      )}
    />
  );
}

export function DerivedFieldListEditor({
  fields,
  onChange,
}: {
  fields: LayerDerivedFieldConfig[];
  onChange: (fields: LayerDerivedFieldConfig[]) => void;
}) {
  const { selectedIndex, setSelectedIndex, patchAt, addItem, removeAt, moveAt } = useSelectableListState({ items: fields, onChange });

  const addDerivedField = useCallback(() => {
    addItem({ as: '', expression: '', type: 'number' });
  }, [addItem]);

  return (
    <SelectableListEditor
      items={fields}
      selectedIndex={selectedIndex}
      onSelect={setSelectedIndex}
      getItemKey={(field, index) => `${field.as || 'derived-field'}-${index}`}
      getItemLabel={(field, index) => field.as || `Derived field ${index + 1}`}
      addButtonLabel="Add derived field"
      onAdd={addDerivedField}
      onMove={moveAt}
      onRemove={removeAt}
      renderEditor={(field, index) => (
        <div>
          <DerivedFieldEditor field={field} patchField={(updates) => patchAt(index, { ...field, ...updates })} />
        </div>
      )}
    />
  );
}

export function FeatureSourceListEditor({
  featureSource,
  timeFilter,
  featureSourceFields,
  availableRefIds,
  onChange,
  onTimeFilterChange,
}: {
  featureSource: FeatureSourceConfig;
  timeFilter: TimeFilterConfig;
  featureSourceFields: string[];
  availableRefIds: string[];
  onChange: (featureSources: FeatureSourceConfig[]) => void;
  onTimeFilterChange: (timeFilter: TimeFilterConfig) => void;
}) {
  const fields = useMemo(() => [featureSource], [featureSource]);

  const { selectedIndex, setSelectedIndex, patchAt, moveAt } = useSelectableListState({ items: fields, onChange });

  return (
    <SelectableListEditor
      maxLength={1}
      items={fields}
      selectedIndex={selectedIndex}
      onSelect={setSelectedIndex}
      getItemKey={(field, index) => `${field.refId}-${index}`}
      getItemLabel={(field, index) => field.refId || 'Feature source'}
      addButtonLabel="Add feature source"
      onMove={moveAt}
      collapsedHint="Click the feature source to configure query and time settings"
      renderEditor={(field, index) => (
        <div>
          <FeatureSourceEditor
            featureSource={field}
            timeFilter={timeFilter}
            featureSourceFields={featureSourceFields}
            availableRefIds={availableRefIds}
            patchFeatureSource={(updates) => patchAt(index, { ...field, ...updates })}
            onTimeFilterChange={onTimeFilterChange}
          />
        </div>
      )}
    />
  );

}

export function DataEditor({
  data,
  derivedFields,
  timeFilter,
  availableRefIds,
  queryFieldsByRefId,
  featureSourceFields,
  onDataChange,
  onDerivedFieldsChange,
  onTimeFilterChange,
}: Props) {
  const joinedSources = data.joinedSources ?? [];

  return (
    <>
      <Field label="Feature Source">
        <FeatureSourceListEditor
          featureSource={data.featureSource}
          timeFilter={timeFilter}
          featureSourceFields={featureSourceFields}
          availableRefIds={availableRefIds}
          onChange={([next]) => onDataChange({ ...data, featureSource: next })}
          onTimeFilterChange={onTimeFilterChange}
         />
      </Field>
      <Field label="Joined Sources">
        <JoinedSourceListEditor
          sources={joinedSources}
          featureSourceId={data.featureSource.id}
          featureSourceFields={featureSourceFields}
          availableRefIds={availableRefIds}
          queryFieldsByRefId={queryFieldsByRefId}
          onChange={(next) => onDataChange({ ...data, joinedSources: next })}
         />
      </Field>
      <Field label="Derived Fields">
        <DerivedFieldListEditor
          fields={derivedFields}
          onChange={onDerivedFieldsChange}
         />
      </Field>
    </>
  );
}
