import { useEffect, useRef } from 'react';
import { useMap } from '@vis.gl/react-google-maps';
import type { MapPanelOptions } from '../../../types';
import type { FitBounds } from '../types';
import { getFitBoundsKey, getFitBoundsOptions } from '../viewState';

interface GoogleFitBoundsProps {
  disabled: boolean;
  fitBounds?: FitBounds;
  fitRequestId?: number;
  options: MapPanelOptions;
}

export function GoogleFitBounds({ disabled, fitBounds, fitRequestId, options }: GoogleFitBoundsProps) {
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
  }, [disabled, fitBounds, fitBoundsOptions.maxZoom, fitBoundsOptions.padding, fitRequestId, map]);

  return null;
}
