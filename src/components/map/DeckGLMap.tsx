import React, { Suspense, lazy } from 'react';
import type { MapProviderProps } from './types';
const LazyGoogleMap = lazy(() => import('./google/GoogleMap'));
const LazyMaplibreMap = lazy(() => import('./maplibre/MaplibreMap'));

function MapProviderFallback({ width, height }: Pick<MapProviderProps, 'width' | 'height'>) {
  return (
    <div
      style={{
        width,
        height,
        background: 'rgba(14, 16, 25, 0.4)',
      }}
    />
  );
}

export function DeckGLMap({ width, height, options, layers, getTooltip, fitBounds, onViewportChange, interleaved }: MapProviderProps) {
  const providerProps: MapProviderProps = {
    width,
    height,
    options,
    layers,
    getTooltip,
    fitBounds,
    onViewportChange,
    interleaved,
  };

  if (options.basemap.provider === 'google') {
    return (
      <Suspense fallback={<MapProviderFallback width={width} height={height} />}>
        <LazyGoogleMap {...providerProps} />
      </Suspense>
    );
  }

  return (
    <Suspense fallback={<MapProviderFallback width={width} height={height} />}>
      <LazyMaplibreMap {...providerProps} />
    </Suspense>
  );
}
