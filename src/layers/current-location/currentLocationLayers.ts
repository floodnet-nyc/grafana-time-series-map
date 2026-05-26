import type { Layer } from '@deck.gl/core';
import { ScatterplotLayer } from '@deck.gl/layers';
import { CURRENT_LOCATION_EFFECT_RADIUS, CurrentLocationPulseExtension } from './currentLocationPulseExtension';

export interface CurrentLocationState {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

interface CurrentLocationPoint {
  position: [number, number];
}

const CORE_COLOR: [number, number, number, number] = [51, 136, 255, 230];
const EFFECT_COLOR: [number, number, number, number] = [51, 136, 255, 255];

export function buildCurrentLocationLayers(location: CurrentLocationState | null): Layer[] {
  if (!location) {
    return [];
  }
  const point: CurrentLocationPoint = {
    position: [location.longitude, location.latitude],
  };

  return [
    new ScatterplotLayer<CurrentLocationPoint>({
      id: 'current-location-effect',
      data: [point],
      getPosition: (d) => d.position,
      radiusUnits: 'pixels',
      getRadius: () => CURRENT_LOCATION_EFFECT_RADIUS,
      getFillColor: EFFECT_COLOR,
      stroked: false,
      filled: true,
      pickable: false,
      billboard: true,
      extensions: [new CurrentLocationPulseExtension()],
    }),
    new ScatterplotLayer<CurrentLocationPoint>({
      id: 'current-location-core',
      data: [point],
      getPosition: (d) => d.position,
      radiusUnits: 'pixels',
      getRadius: () => 6,
      getFillColor: CORE_COLOR,
      getLineColor: [255, 255, 255, 255],
      getLineWidth: 2,
      lineWidthUnits: 'pixels',
      stroked: true,
      filled: true,
      pickable: false,
      billboard: true,
    }),
  ];
}
