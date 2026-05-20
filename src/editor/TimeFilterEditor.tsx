import React from 'react';
import { Field, Combobox, Input, type ComboboxOption } from '@grafana/ui';
import type { TimeFilterConfig, TimeFilterMode } from '../types';
import { SourceRefEditor } from './utils/SourceRefEditor';

const TIME_FILTER_MODES: Array<ComboboxOption<TimeFilterMode>> = [
  { label: 'None (show all rows)', value: 'none' },
  { label: 'Window (within time range)', value: 'window' },
  { label: 'ASOF (closest per series key)', value: 'asof' },
];

interface Props {
  timeFilter: TimeFilterConfig;
  sourceOptions: Array<{ id: string; label: string }>;
  fieldsBySource: Record<string, string[]>;
  onChange: (timeFilter: TimeFilterConfig) => void;
}

export function TimeFilterEditor({ timeFilter, sourceOptions, fieldsBySource, onChange }: Props) {
  const patch = (updates: Partial<TimeFilterConfig>) => onChange({ ...timeFilter, ...updates });

  return (
    <>
      <Field label="Time Filtering">
        <Combobox
          options={TIME_FILTER_MODES}
          value={timeFilter.mode}
          onChange={(v) => patch({ mode: v.value as TimeFilterMode })}
        />
      </Field>
      {timeFilter.mode !== 'none' && (
        <Field label="Time field">
          <SourceRefEditor
            value={timeFilter.time}
            onChange={(value) => patch({ time: value })}
            sourceOptions={sourceOptions}
            fieldsBySource={fieldsBySource}
          />
        </Field>
      )}
      {timeFilter.mode === 'asof' && (
        <>
          <Field label="Group-by field">
            <SourceRefEditor
              value={timeFilter.groupBy}
              onChange={(value) => patch({ groupBy: value })}
              sourceOptions={sourceOptions}
              fieldsBySource={fieldsBySource}
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
