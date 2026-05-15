import React from 'react';
import { Field, Combobox, Input, type ComboboxOption } from '@grafana/ui';
import type { TimeFilterConfig, TimeFilterMode } from '../types';
import { FieldSelect } from './FieldSelect';

const TIME_FILTER_MODES: Array<ComboboxOption<TimeFilterMode>> = [
  { label: 'None (show all rows)', value: 'none' },
  { label: 'Window (within time range)', value: 'window' },
  { label: 'ASOF (closest per series key)', value: 'asof' },
];

interface Props {
  timeFilter: TimeFilterConfig;
  availableFields: string[];
  onChange: (timeFilter: TimeFilterConfig) => void;
}

export function TimeFilterEditor({ timeFilter, availableFields, onChange }: Props) {
  const patch = (updates: Partial<TimeFilterConfig>) => onChange({ ...timeFilter, ...updates });

  return (
    <>
      <Field label="Mode">
        <Combobox
          options={TIME_FILTER_MODES}
          value={timeFilter.mode}
          onChange={(v) => patch({ mode: v.value as TimeFilterMode })}
        />
      </Field>
      {timeFilter.mode !== 'none' && (
        <Field label="Time field">
          <FieldSelect
            value={timeFilter.timeField}
            onChange={(v) => patch({ timeField: v })}
            availableFields={availableFields}
          />
        </Field>
      )}
      {timeFilter.mode === 'asof' && (
        <>
          <Field label="Group-by field">
            <FieldSelect
              value={timeFilter.groupByField ?? ''}
              onChange={(v) => patch({ groupByField: v })}
              availableFields={availableFields}
            />
          </Field>
          <Field label="Max lag (ms)">
            <Input
              type="number"
              value={String(timeFilter.maxLagMs ?? 0)}
              onChange={(e) => patch({ maxLagMs: Number(e.currentTarget.value) })}
            />
          </Field>
        </>
      )}
      {timeFilter.mode === 'window' && (
        <Field label="Window tolerance (ms)">
          <Input
            type="number"
            value={String(timeFilter.windowToleranceMs ?? 0)}
            onChange={(e) => patch({ windowToleranceMs: Number(e.currentTarget.value) })}
          />
        </Field>
      )}
    </>
  );
}
