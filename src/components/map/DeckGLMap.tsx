import React, { Suspense, lazy } from 'react';
import type { MapProviderProps } from './types';
const LazyGoogleMap = lazy(() => import('./google/GoogleMap'));
const LazyMaplibreMap = lazy(() => import('./maplibre/MaplibreMap'));
import { buildDeckEffects } from 'utils/deckgl/lighting';
import { buildDeckParameters } from 'utils/deckgl/parameters';
import { createWidgets } from 'widgets/_all';
import {LightGlassTheme} from '@deck.gl/widgets';

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

export function useDeckGLProps({ options, layers, getTooltip }: {
  options: MapProviderProps['options'];
  layers: MapProviderProps['deckProps']['layers'];
  getTooltip?: MapProviderProps['deckProps']['getTooltip'];
}) {
  const effects = buildDeckEffects(options.deck.lighting);
  const parameters = buildDeckParameters(options.deck.parameters);
  const widgets = createWidgets(options.widgets ?? []);
  return {
    effects,
    parameters,
    widgets,
    style: LightGlassTheme,
    layers,
    getTooltip,
    interleaved: options.deck.interleaved,
  } as MapProviderProps['deckProps'];
}

export function DeckGLMap(providerProps: MapProviderProps) {
  const fallback = <MapProviderFallback width={providerProps.width} height={providerProps.height} />;
  if (providerProps.options.basemap.provider === 'google') {
    return (
      <Suspense fallback={fallback}>
        <LazyGoogleMap {...providerProps} />
      </Suspense>
    );
  }
  return (
    <Suspense fallback={fallback}>
      <LazyMaplibreMap {...providerProps} />
    </Suspense>
  );
}
