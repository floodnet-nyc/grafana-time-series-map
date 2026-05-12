export interface ViewportSnapshot {
  latitude: number;
  longitude: number;
  zoom: number;
  bearing: number;
  pitch: number;
}

export type FitBounds = [[number, number], [number, number]];
