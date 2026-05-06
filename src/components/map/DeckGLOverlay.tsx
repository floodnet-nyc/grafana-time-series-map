import { useEffect } from 'react';
import type { Layer } from '@deck.gl/core';

interface Props {
  layers: Layer[];
  // Accepts either a MapboxOverlay or GoogleMapsOverlay instance
  overlayRef: React.MutableRefObject<any | null>;
}

// Unified wrapper: callers create the overlay once and pass the ref here.
// This component keeps overlay.setProps() in sync with each render.
export function DeckGLOverlay({ layers, overlayRef }: Props) {
  useEffect(() => {
    overlayRef.current?.setProps({ layers });
  });
  return null;
}
