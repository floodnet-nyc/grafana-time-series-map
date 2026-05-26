import React, { Suspense, lazy, useMemo } from 'react';

const LazyMonacoEditor = lazy(async () => {
  const [{ default: Editor, loader }, monaco] = await Promise.all([
    import('@monaco-editor/react'),
    import('monaco-editor'),
  ]);
  loader.config({ monaco });
  return { default: Editor };
});

interface HtmlCodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  height?: number;
  language?: string;
}

export function HtmlCodeEditor({ value, onChange, height = 240, language = 'html' }: HtmlCodeEditorProps) {
  const fallback = useMemo(() => (
    <div
      style={{
        height,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(255, 255, 255, 0.03)',
        color: 'rgba(255, 255, 255, 0.65)',
        fontSize: 12,
      }}
    >
      Loading editor...
    </div>
  ), [height]);

  return (
    <div style={{ border: '1px solid rgba(255, 255, 255, 0.14)', borderRadius: 6, overflow: 'hidden' }}>
      <Suspense fallback={fallback}>
        <LazyMonacoEditor
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
      </Suspense>
    </div>
  );
}
