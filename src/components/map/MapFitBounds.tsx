import { useEffect, useRef } from 'react';
import { WebMercatorViewport, FlyToInterpolator } from '@deck.gl/core';
import type { MapPanelOptions } from '../../types';
import type { FitBounds, ViewportSnapshot } from './types';
import type { WidgetViewStateChange } from '../../widgets/types';

import type { MapHashView } from 'hooks/useMapHashRoute';

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

export interface MapFitBoundsProps<TMap> {
  disabled: boolean;
  fitBounds?: FitBounds;
  fitRequestId?: number;
  options: MapPanelOptions;
  /** Provided in DeckGL controller mode. Computes the target viewport and
   *  calls this callback instead of calling map.fitBounds() directly (which would
   *  conflict with DeckGL's viewport ownership). */
  onViewState?: (viewState: WidgetViewStateChange) => void;
  /** The map instance, may be null until mount. */
  map?: TMap | null;
  /** Provider-specific: fit bounds on the map. */
  fitBoundsToMap: (map: TMap, bounds: FitBounds, fitBoundsOptions: { padding: number; maxZoom?: number }) => void;
  /** Provider-specific: get the container dimensions for deck viewport calc. */
  getContainerSize: (map: TMap) => { width: number; height: number } | null;
}

export function MapFitBounds<TMap>({
  disabled,
  fitBounds,
  fitRequestId,
  options,
  onViewState,
  map,
  fitBoundsToMap,
  getContainerSize,
}: MapFitBoundsProps<TMap>) {
  const prevFitBoundsRef = useRef<string | null>(null);
  const prevFitRequestRef = useRef<number>(0);
  const fitBoundsOptions = getFitBoundsOptions(options);

  useEffect(() => {
    if (disabled || !map) {
      return;
    }
    const key = getFitBoundsKey(fitBounds);
    const forcedFit = Boolean(fitRequestId && fitRequestId !== prevFitRequestRef.current);
    if (!fitBounds || (key === prevFitBoundsRef.current && !forcedFit)) {
      return;
    }

    prevFitBoundsRef.current = key;
    if (fitRequestId) {
      prevFitRequestRef.current = fitRequestId;
    }

    if (onViewState) {
      const size = getContainerSize(map);
      if (!size) {
        return;
      }
      const vp = new WebMercatorViewport({ width: size.width, height: size.height });
      const { longitude, latitude, zoom } = vp.fitBounds(fitBounds, fitBoundsOptions);
      onViewState({
        longitude,
        latitude,
        zoom,
        transitionInterpolator: new FlyToInterpolator({ speed: 2 }),
        transitionDuration: 'auto',
      });
    } else {
      fitBoundsToMap(map, fitBounds, fitBoundsOptions);
    }
  }, [disabled, fitBounds, fitBoundsOptions, fitRequestId, map, onViewState, fitBoundsToMap, getContainerSize]);

  return null;
}
