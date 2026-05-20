import { useEffect, useRef } from 'react';
import { WebMercatorViewport, FlyToInterpolator } from '@deck.gl/core';
import type { MapPanelOptions } from '../../types';
import type { FitBounds } from './types';
import { getFitBoundsKey, getFitBoundsOptions } from '../../utils/map/viewState';

export interface MapFitBoundsProps {
  disabled: boolean;
  fitBounds?: FitBounds;
  fitRequestId?: number;
  options: MapPanelOptions;
  /** Provided in DeckGL controller mode. Computes the target viewport and
   *  calls this callback instead of calling map.fitBounds() directly (which would
   *  conflict with DeckGL's viewport ownership). */
  onViewState?: (viewState: object) => void;
  /** The map instance, may be null until mount. */
  map?: unknown;
  /** Provider-specific: fit bounds on the map. */
  fitBoundsToMap: (map: unknown, bounds: FitBounds, fitBoundsOptions: { padding: number; maxZoom?: number }) => void;
  /** Provider-specific: get the container dimensions for deck viewport calc. */
  getContainerSize: (map: unknown) => { width: number; height: number } | null;
}

export function MapFitBounds({
  disabled,
  fitBounds,
  fitRequestId,
  options,
  onViewState,
  map,
  fitBoundsToMap,
  getContainerSize,
}: MapFitBoundsProps) {
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
