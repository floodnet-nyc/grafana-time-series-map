import type { Layer } from "@deck.gl/core";
import type { MapPanelOptions } from "types";

export interface ViewportSnapshot {
  latitude: number;
  longitude: number;
  zoom: number;
  bearing: number;
  pitch: number;
}

export type FitBounds = [[number, number], [number, number]];

export interface MapProviderProps {
  width: number;
  height: number;
  options: MapPanelOptions;
  layers: Layer[];
  fitBounds?: FitBounds;
  interleaved?: boolean;
  onViewportChange?: (viewport: ViewportSnapshot) => void;
}
