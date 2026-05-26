import React, { Suspense, lazy } from 'react';
import type { MapProviderProps } from './types';
import MaplibreMap from './maplibre/MaplibreMap';

const GoogleMap = lazy(() => import(/* webpackChunkName: "google-map" */ './google/GoogleMap'));

export function DeckGLMap(providerProps: MapProviderProps) {
  if (providerProps.options.basemap.provider === 'google') {
    return (
      <Suspense fallback={<div style={{ width: providerProps.width, height: providerProps.height }} />}>
        <GoogleMap {...providerProps} />
      </Suspense>
    );
  }
  return <MaplibreMap {...providerProps} />;
}
