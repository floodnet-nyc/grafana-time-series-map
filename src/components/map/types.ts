import type { DeckProps } from '@deck.gl/core';
import type { MapPanelOptions } from '../../types';

export interface ViewportSnapshot {
  latitude: number;
  longitude: number;
  zoom: number;
  bearing: number;
  pitch: number;
}

export type FitBounds = [[number, number], [number, number]];

export type DeckTooltipContent =
  | string
  | {
      text?: string;
      html?: string;
      className?: string;
      style?: Partial<CSSStyleDeclaration>;
    }
  | null;



export interface MapProviderProps {
  width: number;
  height: number;
  options: MapPanelOptions;

  deckProps: DeckProps & { interleaved?: boolean };
  fitBounds?: FitBounds;
  fitRequestId?: number;
  onViewportChange?: (viewport: ViewportSnapshot) => void;
}
