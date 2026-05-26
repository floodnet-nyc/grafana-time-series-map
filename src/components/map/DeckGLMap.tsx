import React, { Suspense, lazy } from 'react';
import type { MapProviderProps } from './types';
const MaplibreMap = lazy(() => import(/* webpackChunkName: "maplibre-map" */ './maplibre/MaplibreMap'));
const GoogleMap = lazy(() => import(/* webpackChunkName: "google-map" */ './google/GoogleMap'));

export function DeckGLMap(providerProps: MapProviderProps) {
  if (providerProps.options.basemap.provider === 'google') {
    return (
      <Suspense fallback={<div style={{ width: providerProps.width, height: providerProps.height }} />}>
        <GoogleMap {...providerProps} />
      </Suspense>
    );
  }
  return (
    <Suspense fallback={<div style={{ width: providerProps.width, height: providerProps.height }} />}>
      <MaplibreMap {...providerProps} />
    </Suspense>
  );
}
