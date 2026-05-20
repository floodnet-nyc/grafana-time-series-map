import React, { useMemo } from 'react';
import { Combobox } from '@grafana/ui';
import { getTemplateSrv } from '@grafana/runtime';
import type { StandardEditorProps } from '@grafana/data';

export function VariableSelectEditor({ value, onChange }: StandardEditorProps<string>) {
  const options = useMemo(() => {
    try {
      return getTemplateSrv()
        .getVariables()
        .map((v) => ({ label: `$${v.name}`, value: v.name }));
    } catch {
      return [];
    }
  }, []);

  return (
    <Combobox
      options={options}
      value={value ?? ''}
      onChange={(v) => onChange(v?.value ?? '')}
      placeholder="Select a dashboard variable"
    />
  );
}
