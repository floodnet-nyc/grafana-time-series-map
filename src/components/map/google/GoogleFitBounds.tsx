import { useEffect, useRef } from 'react';
import { useMap } from '@vis.gl/react-google-maps';
import type { MapHashView } from '../../../hooks/useMapHashRoute';
import type { FitBounds } from '../types';
import { FIT_BOUNDS_PADDING_PX, getFitBoundsKey } from '../viewState';

interface GoogleFitBoundsProps {
  disabled: boolean;
  initialHashView?: MapHashView;
  fitBounds?: FitBounds;
}

export function GoogleFitBounds({ disabled, initialHashView, fitBounds }: GoogleFitBoundsProps) {
  const map = useMap();
  const prevFitBoundsRef = useRef<string | null>(null);

  useEffect(() => {
    const key = getFitBoundsKey(fitBounds);
    if (disabled || !map) {
      return;
    }

    if (initialHashView) {
      map.moveCamera({
        center: { lat: initialHashView.latitude, lng: initialHashView.longitude },
        zoom: initialHashView.zoom,
        heading: initialHashView.bearing,
        tilt: initialHashView.pitch,
      });
      return;
    }

    if (!fitBounds || key === prevFitBoundsRef.current) {
      return;
    }

    prevFitBoundsRef.current = key;
    map.fitBounds(
      new google.maps.LatLngBounds(
        { lat: fitBounds[0][1], lng: fitBounds[0][0] },
        { lat: fitBounds[1][1], lng: fitBounds[1][0] },
      ),
      FIT_BOUNDS_PADDING_PX,
    );
  }, [disabled, fitBounds, initialHashView, map]);

  return null;
}
