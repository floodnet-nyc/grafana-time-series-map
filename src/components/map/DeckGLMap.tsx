import React, { Suspense, lazy, useMemo } from 'react';
import type { DeckProps } from '@deck.gl/core';
import type { MapProviderProps, WidgetCallbacks } from './types';
import type { MapPanelOptions } from '../../types';
import { buildDeckEffects } from 'utils/deckgl/lighting';
import { buildDeckParameters } from 'utils/deckgl/parameters';
import { createWidgets } from 'widgets/_all';
import { LightGlassTheme } from '@deck.gl/widgets';
import { buildDeckTooltip, DEFAULT_TOOLTIP_TEMPLATE } from 'utils/tooltip';

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

export function useDeckGLProps({
  options,
  layers,
  widgetCallbacks,
}: {
  options: MapPanelOptions;
  layers: DeckProps['layers'];
  widgetCallbacks?: WidgetCallbacks;
}): DeckProps & { interleaved?: boolean } {
  const effects = buildDeckEffects(options.deck.lighting);
  const parameters = buildDeckParameters(options.deck.parameters);
  const widgets = createWidgets(options.widgets ?? [], widgetCallbacks);
  const getTooltip = useMemo(
    () => (options.tooltip.show !== false ? buildDeckTooltip(options.tooltip.template ?? DEFAULT_TOOLTIP_TEMPLATE) : null),
    [options.tooltip.show, options.tooltip.template],
  );
  // console.log('DeckGL props', { effects, parameters, widgets, layers });
  return {
    effects,
    parameters,
    widgets,
    style: LightGlassTheme,
    layers,
    getTooltip,
    interleaved: options.deck.interleaved,
    pickingRadius: options.deck.pickingRadius ?? 5,
  };
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
