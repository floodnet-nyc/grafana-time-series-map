import type { MapHashView } from '../../hooks/useMapHashRoute';
import type { MapPanelOptions } from '../../types';
import type { FitBounds, ViewportSnapshot } from '../../components/map/types';

export const FIT_BOUNDS_PADDING_PX = 48;
export const FIT_BOUNDS_MAX_ZOOM = 22;

export function getFitBoundsKey(fitBounds?: FitBounds): string | null {
  return fitBounds ? JSON.stringify(fitBounds) : null;
}

export function getManualViewport(options: MapPanelOptions): ViewportSnapshot {
  const { latitude, longitude, zoom, bearing, pitch } = options.initialView.state;
  return { latitude, longitude, zoom, bearing: bearing ?? 0, pitch: pitch ?? 0 };
}

export function getFitBoundsOptions(options: MapPanelOptions) {
  return {
    padding: options.initialView.fitData?.padding ?? FIT_BOUNDS_PADDING_PX,
    maxZoom: options.initialView.fitData?.maxZoom ?? FIT_BOUNDS_MAX_ZOOM,
  };
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
