import React, { useMemo } from 'react';
import { Combobox, type ComboboxOption } from '@grafana/ui';
import type { SourceRef } from 'types';
import { DEFAULT_FEATURE_SOURCE_ID } from 'layers/defaults';

interface SourceOption {
  id: string;
  label: string;
}

interface Props<T> {
  value?: T;
  onChange: (value: SourceRef) => void;
  sourceOptions: SourceOption[];
  fieldsBySource: Record<string, string[]>;
  placeholder?: string;
}

interface SourceRefProps extends Props<SourceRef> {
  sourceId?: never;
}

interface FixedSourceProps extends Props<string> {
  sourceId: string;
}

type SourceRefEditorProps = SourceRefProps | FixedSourceProps;

function encodeRef(source: string, field: string) {
  return JSON.stringify({ source, field });
}

function decodeRef(value: string): SourceRef | undefined {
  try {
    const parsed = JSON.parse(value);
    if (parsed && typeof parsed.source === 'string' && typeof parsed.field === 'string') {
      return parsed;
    }
  } catch {
    return undefined;
  }
  return undefined;
}

export function SeparateSourceRefEditor({
  value,
  onChange,
  sourceOptions,
  fieldsBySource,
  placeholder,
}: SourceRefProps) {
  const source = value?.source ?? sourceOptions[0]?.id ?? DEFAULT_FEATURE_SOURCE_ID;
  const field = value?.field ?? '';
  const fieldOptions = useMemo(
    () => (fieldsBySource[source] ?? []).map((item) => ({ label: item, value: item })),
    [fieldsBySource, source]
  );

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(120px, 0.8fr) minmax(0, 1.2fr)', gap: '0.5rem' }}>
      <Combobox
        options={sourceOptions.map((option) => ({ label: option.label, value: option.id }))}
        value={source}
        onChange={(selected) => onChange({ source: String(selected?.value ?? source), field })}
      />
      <Combobox
        options={fieldOptions}
        value={field || null}
        onChange={(selected) => onChange({ source, field: selected?.value != null ? String(selected.value) : '' })}
        isClearable
        createCustomValue
        placeholder={placeholder ?? 'Field name…'}
      />
    </div>
  );
}

export function CombinedSourceRefEditor({
  value,
  onChange,
  sourceOptions,
  fieldsBySource,
  placeholder,
}: SourceRefProps) {
  const currentSource = value?.source ?? sourceOptions[0]?.id ?? DEFAULT_FEATURE_SOURCE_ID;
  const options = useMemo<Array<ComboboxOption<string>>>(
    () =>
      sourceOptions.flatMap((sourceOption) =>
        (fieldsBySource[sourceOption.id] ?? []).map((field) => ({
          label: field,
          description: sourceOption.id,
          value: encodeRef(sourceOption.id, field),
        }))
      ),
    [fieldsBySource, sourceOptions]
  );

  return (
    <Combobox
      options={options}
      value={value?.field ? encodeRef(value.source, value.field) : null}
      onChange={(selected) => {
        const rawValue = selected?.value != null ? String(selected.value) : '';
        const decoded = decodeRef(rawValue);
        onChange(decoded ?? { source: currentSource, field: rawValue });
      }}
      isClearable
      createCustomValue
      placeholder={placeholder ?? 'Field name…'}
    />
  );
}

export function FixedSourceRefEditor({
  value,
  onChange,
  sourceOptions,
  fieldsBySource,
  placeholder,
  sourceId,
}: FixedSourceProps) {
  const field = value ?? '';
  const fieldOptions = useMemo(
    () => (fieldsBySource[sourceId] ?? []).map((item) => ({ label: item, value: item })),
    [fieldsBySource, sourceId]
  );

  return (
    <Combobox
      options={fieldOptions}
      value={field || null}
      onChange={(selected) =>
        onChange({ source: sourceId, field: selected?.value != null ? String(selected.value) : '' })
      }
      isClearable
      createCustomValue
      placeholder={placeholder ?? 'Field name…'}
    />
  );
}

export function SourceRefEditor(props: SourceRefEditorProps) {
  if (props.sourceId != null) {
    return <FixedSourceRefEditor {...props} />;
  }
  // return <SeparateSourceRefEditor {...props} />;
  return <CombinedSourceRefEditor {...props} />;
  // // Use combined editor if there are multiple sources, otherwise separate editor is more user-friendly
  // const useCombined = props.sourceOptions.length > 1;
  // return useCombined ? <CombinedSourceRefEditor {...props} /> : <SeparateSourceRefEditor {...props} />;
}
