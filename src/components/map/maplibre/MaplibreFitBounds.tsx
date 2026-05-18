import { useEffect, useRef } from 'react';
import { useMap } from 'react-map-gl/maplibre';
import { WebMercatorViewport, FlyToInterpolator } from '@deck.gl/core';
import type { MapPanelOptions } from '../../../types';
import type { FitBounds } from '../types';
import { getFitBoundsKey, getFitBoundsOptions } from '../../../utils/map/viewState';

interface MaplibreFitBoundsProps {
  disabled: boolean;
  fitBounds?: FitBounds;
  fitRequestId?: number;
  options: MapPanelOptions;
  /** Provided in DeckGL controller mode. When set, computes the target viewport and
   *  calls this callback instead of calling map.fitBounds() directly (which would
   *  conflict with DeckGL's viewport ownership). */
  onViewState?: (viewState: object) => void;
}

export function MaplibreFitBounds({ disabled, fitBounds, fitRequestId, options, onViewState }: MaplibreFitBoundsProps) {
  const { current: mapRef } = useMap();
  const prevFitBoundsRef = useRef<string | null>(null);
  const prevFitRequestRef = useRef<number>(0);
  const fitBoundsOptions = getFitBoundsOptions(options);

  useEffect(() => {
    // console.log('MaplibreFitBounds effect', { disabled, fitBounds, fitRequestId, options });
    if (disabled) { return; }
    const key = getFitBoundsKey(fitBounds);
    const forcedFit = Boolean(fitRequestId && fitRequestId !== prevFitRequestRef.current);
    if (!fitBounds || (key === prevFitBoundsRef.current && !forcedFit)) { return; }
    prevFitBoundsRef.current = key;
    if (fitRequestId) { prevFitRequestRef.current = fitRequestId; }

    const map = mapRef?.getMap();
    // console.log('Fitting bounds', { key, forcedFit, fitBounds, options });
    if (!map) { return; }

    if (onViewState) {
      const { clientWidth: width, clientHeight: height } = map.getContainer();
      const vp = new WebMercatorViewport({ width, height });
      const { longitude, latitude, zoom } = vp.fitBounds(fitBounds, fitBoundsOptions);
      onViewState({
        longitude,
        latitude,
        zoom,
        transitionInterpolator: new FlyToInterpolator({ speed: 2 }),
        transitionDuration: 'auto',
      });
    } else {
      map.fitBounds(fitBounds as any, { ...fitBoundsOptions, duration: 800 });
    }
  }, [disabled, fitBounds, fitBoundsOptions, fitRequestId, mapRef, onViewState]);

  return null;
}
