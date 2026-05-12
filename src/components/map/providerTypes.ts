import type { Layer } from '@deck.gl/core';
import type { MapPanelOptions } from '../../types';
import type { FitBounds, ViewportSnapshot } from './types';

export interface MapProviderProps {
  width: number;
  height: number;
  options: MapPanelOptions;
  layers: Layer[];
  fitBounds?: FitBounds;
  interleaved?: boolean;
  onViewportChange?: (viewport: ViewportSnapshot) => void;
}
