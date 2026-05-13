import React from 'react';
import type { StandardEditorProps } from '@grafana/data';
import { HtmlCodeEditor } from './HtmlCodeEditor';
import { DEFAULT_TOOLTIP_TEMPLATE } from '../layers/extensions/tooltip';

export function TooltipTemplateEditor({ value, onChange }: StandardEditorProps<string>) {
  return (
    <HtmlCodeEditor
      value={value ?? DEFAULT_TOOLTIP_TEMPLATE}
      onChange={onChange}
      language="html"
      height={280}
    />
  );
}
