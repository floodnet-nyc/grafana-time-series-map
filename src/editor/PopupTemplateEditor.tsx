import React from 'react';
import type { StandardEditorProps } from '@grafana/data';
import { HtmlCodeEditor } from './HtmlCodeEditor';
import { DEFAULT_POPUP_TEMPLATE } from '../components/SensorPopup';

export function PopupTemplateEditor({ value, onChange }: StandardEditorProps<string>) {
  return (
    <HtmlCodeEditor
      value={value ?? DEFAULT_POPUP_TEMPLATE}
      onChange={onChange}
      language="html"
      height={280}
    />
  );
}
