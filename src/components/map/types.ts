import type { Layer, PickingInfo } from '@deck.gl/core';
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
  layers: Layer[];
  getTooltip?: ((info: PickingInfo) => DeckTooltipContent) | null;
  fitBounds?: FitBounds;
  fitRequestId?: number;
  interleaved?: boolean;
  onViewportChange?: (viewport: ViewportSnapshot) => void;
}
