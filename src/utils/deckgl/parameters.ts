import type { DeckRenderParametersOptions } from '../../types';

export const DEFAULT_DECK_PARAMETERS: Required<DeckRenderParametersOptions> = {
  blend: false,
  blendColorOperation: 'add',
  blendColorSrcFactor: 'src-alpha',
  blendColorDstFactor: 'one-minus-src-alpha',
  blendAlphaOperation: 'add',
  blendAlphaSrcFactor: 'one',
  blendAlphaDstFactor: 'one-minus-src-alpha',
  polygonOffsetFill: true,
  depthWriteEnabled: true,
  depthCompare: 'less-equal',
};

export function buildDeckParameters(options?: DeckRenderParametersOptions) {
  return {
    ...DEFAULT_DECK_PARAMETERS,
    ...(options ?? {}),
  };
}
