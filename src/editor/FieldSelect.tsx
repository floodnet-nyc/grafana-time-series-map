import React, { useMemo } from 'react';
import { Combobox } from '@grafana/ui';

interface Props {
  value: string;
  onChange: (v: string) => void;
  availableFields: string[];
  placeholder?: string;
}

export function FieldSelect({ value, onChange, availableFields, placeholder }: Props) {
  const opts = useMemo(() => availableFields.map((f) => ({ label: f, value: f })), [availableFields]);
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
