import React, { useCallback } from 'react';
import { CollapsableSection, Combobox, Field, Switch } from '@grafana/ui';
import type { StandardEditorProps } from '@grafana/data';
import type { DeckBlendFactor, DeckBlendOperation, DeckRenderParametersOptions } from 'types';
import { DEFAULT_DECK_PARAMETERS } from 'utils/deckgl/parameters';

const deckBlendOperations: Array<{ label: string; value: DeckBlendOperation }> = [
  { label: 'Add', value: 'add' },
  { label: 'Subtract', value: 'subtract' },
  { label: 'Reverse subtract', value: 'reverse-subtract' },
  { label: 'Min', value: 'min' },
  { label: 'Max', value: 'max' },
];

const deckBlendFactors: Array<{ label: string; value: DeckBlendFactor }> = [
  { label: 'Zero', value: 'zero' },
  { label: 'One', value: 'one' },
  { label: 'Source', value: 'src' },
  { label: 'One minus source', value: 'one-minus-src' },
  { label: 'Source alpha', value: 'src-alpha' },
  { label: 'One minus source alpha', value: 'one-minus-src-alpha' },
  { label: 'Destination', value: 'dst' },
  { label: 'One minus destination', value: 'one-minus-dst' },
  { label: 'Destination alpha', value: 'dst-alpha' },
  { label: 'One minus destination alpha', value: 'one-minus-dst-alpha' },
  { label: 'Source alpha saturated', value: 'src-alpha-saturated' },
  { label: 'Constant', value: 'constant' },
  { label: 'One minus constant', value: 'one-minus-constant' },
];

export function DeckBlendingEditor({ value, onChange }: StandardEditorProps<DeckRenderParametersOptions>) {
  const parameters = { ...DEFAULT_DECK_PARAMETERS, ...(value ?? {}) };

  const patch = useCallback((updates: Partial<DeckRenderParametersOptions>) => {
    onChange({ ...parameters, ...updates });
  }, [onChange, parameters]);

  return (
    <CollapsableSection label="Blending" isOpen={false}>
      <Field label="Enable blending" description="Enable GPU blending for deck.gl rendering. Layer parameters can still override this.">
        <Switch value={parameters.blend} onChange={(event) => patch({ blend: event.currentTarget.checked })} />
      </Field>
      {parameters.blend && (
        <>
          <Field label="Color blend operation">
            <Combobox
              options={deckBlendOperations}
              value={parameters.blendColorOperation}
              onChange={(option) => patch({ blendColorOperation: option?.value as DeckBlendOperation })}
            />
          </Field>
          <Field label="Color source factor">
            <Combobox
              options={deckBlendFactors}
              value={parameters.blendColorSrcFactor}
              onChange={(option) => patch({ blendColorSrcFactor: option?.value as DeckBlendFactor })}
            />
          </Field>
          <Field label="Color destination factor">
            <Combobox
              options={deckBlendFactors}
              value={parameters.blendColorDstFactor}
              onChange={(option) => patch({ blendColorDstFactor: option?.value as DeckBlendFactor })}
            />
          </Field>
          <Field label="Alpha blend operation">
            <Combobox
              options={deckBlendOperations}
              value={parameters.blendAlphaOperation}
              onChange={(option) => patch({ blendAlphaOperation: option?.value as DeckBlendOperation })}
            />
          </Field>
          <Field label="Alpha source factor">
            <Combobox
              options={deckBlendFactors}
              value={parameters.blendAlphaSrcFactor}
              onChange={(option) => patch({ blendAlphaSrcFactor: option?.value as DeckBlendFactor })}
            />
          </Field>
          <Field label="Alpha destination factor">
            <Combobox
              options={deckBlendFactors}
              value={parameters.blendAlphaDstFactor}
              onChange={(option) => patch({ blendAlphaDstFactor: option?.value as DeckBlendFactor })}
            />
          </Field>
        </>
      )}
    </CollapsableSection>
  );
}
