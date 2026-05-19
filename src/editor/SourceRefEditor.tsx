import React, { useMemo } from 'react';
import { Combobox } from '@grafana/ui';
import type { SourceRef } from '../types';
import { DEFAULT_FEATURE_SOURCE_ID } from '../layers/defaults';

interface SourceOption {
  id: string;
  label: string;
}

interface Props {
  value?: SourceRef;
  onChange: (value: SourceRef) => void;
  sourceOptions: SourceOption[];
  fieldsBySource: Record<string, string[]>;
  placeholder?: string;
}

export function SourceRefEditor({ value, onChange, sourceOptions, fieldsBySource, placeholder }: Props) {
  const source = value?.source ?? sourceOptions[0]?.id ?? DEFAULT_FEATURE_SOURCE_ID;
  const field = value?.field ?? '';
  const fieldOptions = useMemo(
    () => (fieldsBySource[source] ?? []).map((item) => ({ label: item, value: item })),
    [fieldsBySource, source],
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
