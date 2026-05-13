import React from 'react';
import Editor, { loader } from '@monaco-editor/react';
import * as monaco from 'monaco-editor';

loader.config({ monaco });

interface HtmlCodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  height?: number;
  language?: string;
}

export function HtmlCodeEditor({ value, onChange, height = 240, language = 'html' }: HtmlCodeEditorProps) {
  return (
    <div style={{ border: '1px solid rgba(255, 255, 255, 0.14)', borderRadius: 6, overflow: 'hidden' }}>
      <Editor
        height={height}
        defaultLanguage={language}
        language={language}
        theme="vs-dark"
        value={value}
        onChange={(nextValue) => onChange(nextValue ?? '')}
        options={{
          automaticLayout: true,
          fontSize: 12,
          glyphMargin: false,
          lineDecorationsWidth: 8,
          lineNumbers: 'on',
          lineNumbersMinChars: 2,
          minimap: { enabled: false },
          padding: { top: 10, bottom: 10 },
          quickSuggestions: false,
          scrollBeyondLastLine: false,
          tabSize: 2,
          scrollbar: {
            alwaysConsumeMouseWheel: false,
            horizontal: 'auto',
            horizontalScrollbarSize: 10,
            verticalScrollbarSize: 10,
          },
          wordWrap: 'off',
          wrappingIndent: 'none',
        }}
      />
    </div>
  );
}
