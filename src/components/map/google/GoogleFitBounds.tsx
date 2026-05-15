import { useEffect, useRef } from 'react';
import { useMap } from '@vis.gl/react-google-maps';
import { WebMercatorViewport, FlyToInterpolator } from '@deck.gl/core';
import type { MapPanelOptions } from '../../../types';
import type { FitBounds } from '../types';
import { getFitBoundsKey, getFitBoundsOptions } from '../viewState';

interface GoogleFitBoundsProps {
  disabled: boolean;
  fitBounds?: FitBounds;
  fitRequestId?: number;
  options: MapPanelOptions;
  /** Provided in DeckGL controller mode. Computes the target viewport and calls this
   *  callback instead of calling map.fitBounds() directly. */
  onViewState?: (viewState: object) => void;
}

export function GoogleFitBounds({ disabled, fitBounds, fitRequestId, options, onViewState }: GoogleFitBoundsProps) {
  const map = useMap();
  const prevFitBoundsRef = useRef<string | null>(null);
  const prevFitRequestRef = useRef<number>(0);
  const fitBoundsOptions = getFitBoundsOptions(options);

  useEffect(() => {
    // console.log('GoogleFitBounds effect', { disabled, fitBounds, fitRequestId, options });
    if (disabled || !map) { return; }
    const key = getFitBoundsKey(fitBounds);
    const forcedFit = Boolean(fitRequestId && fitRequestId !== prevFitRequestRef.current);
    if (!fitBounds || (key === prevFitBoundsRef.current && !forcedFit)) { return; }

    prevFitBoundsRef.current = key;
    if (fitRequestId) { prevFitRequestRef.current = fitRequestId; }

    if (onViewState) {
      const div = map.getDiv();
      const vp = new WebMercatorViewport({ width: div.clientWidth, height: div.clientHeight });
      const { longitude, latitude, zoom } = vp.fitBounds(fitBounds, fitBoundsOptions);
      onViewState({
        longitude,
        latitude,
        zoom,
        transitionInterpolator: new FlyToInterpolator({ speed: 2 }),
        transitionDuration: 'auto',
      });
    } else {
      map.fitBounds(
        new google.maps.LatLngBounds(
          { lat: fitBounds[0][1], lng: fitBounds[0][0] },
          { lat: fitBounds[1][1], lng: fitBounds[1][0] },
        ),
        fitBoundsOptions.padding,
      );
      const currentZoom = map.getZoom();
      if (typeof fitBoundsOptions.maxZoom === 'number' && typeof currentZoom === 'number' && currentZoom > fitBoundsOptions.maxZoom) {
        map.setZoom(fitBoundsOptions.maxZoom);
      }
    }
  }, [disabled, fitBounds, fitBoundsOptions, fitRequestId, map, onViewState]);

  return null;
}
