import type { MapHashView } from '../../hooks/useMapHashRoute';
import type { MapPanelOptions } from '../../types';
import type { FitBounds, ViewportSnapshot } from './types';

export const FIT_BOUNDS_PADDING_PX = 48;

export function getFitBoundsKey(fitBounds?: FitBounds): string | null {
  return fitBounds ? JSON.stringify(fitBounds) : null;
}

export function getManualViewport(options: MapPanelOptions): ViewportSnapshot {
  const { latitude, longitude, zoom, bearing, pitch } = options.initialViewState;
  return { latitude, longitude, zoom, bearing: bearing ?? 0, pitch: pitch ?? 0 };
}

export function getInitialViewport(options: MapPanelOptions, hashView?: MapHashView): ViewportSnapshot {
  if (hashView) {
    return {
      latitude: hashView.latitude,
      longitude: hashView.longitude,
      zoom: hashView.zoom,
      bearing: hashView.bearing,
      pitch: hashView.pitch,
    };
  }

  return getManualViewport(options);
}
