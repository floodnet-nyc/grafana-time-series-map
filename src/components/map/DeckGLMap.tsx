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

export function DeckGLMap({ width, height, options, layers, getTooltip, fitBounds, fitRequestId, onViewportChange, interleaved }: {
  width: number;
  height: number;
  options: MapProviderProps['options'];
  layers: MapProviderProps['deckProps']['layers'];
  getTooltip?: MapProviderProps['deckProps']['getTooltip'];
  fitBounds?: MapProviderProps['fitBounds'];
  fitRequestId?: MapProviderProps['fitRequestId'];
  onViewportChange?: MapProviderProps['onViewportChange'];
  interleaved?: boolean;
}) {
  const effects = buildDeckEffects(options.deck.lighting);
  const parameters = buildDeckParameters(options.deck.parameters);
  const widgets = createWidgets(options.widgets ?? []);
  const providerProps: MapProviderProps = {
    width,
    height,
    options,
    fitBounds,
    fitRequestId,
    onViewportChange,

    deckProps: {
      effects,
      parameters,
      widgets,
      style: LightGlassTheme,
      layers,
      getTooltip,
      interleaved,
    },
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
