import React, { useMemo } from 'react';
import type { DeckProps } from '@deck.gl/core';
import type { MapProviderProps, WidgetCallbacks } from './types';
import type { MapPanelOptions } from '../../types';
import { buildDeckEffects } from 'utils/deckgl/lighting';
import { buildDeckParameters } from 'utils/deckgl/parameters';
import { createWidgets } from 'widgets/_all';
import { LightGlassTheme } from '@deck.gl/widgets';
import { buildDeckTooltip, DEFAULT_TOOLTIP_TEMPLATE } from 'utils/tooltip';
import GoogleMap from './google/GoogleMap';
import MaplibreMap from './maplibre/MaplibreMap';

export function useDeckGLProps({
  options,
  layers,
  widgetCallbacks,
}: {
  options: MapPanelOptions;
  layers: DeckProps['layers'];
  widgetCallbacks?: WidgetCallbacks;
}): DeckProps & { interleaved?: boolean } {
  const effects = useMemo(() => buildDeckEffects(options.deck.lighting), [options.deck.lighting]);
  const parameters = useMemo(() => buildDeckParameters(options.deck.parameters), [options.deck.parameters]);
  const widgets = useMemo(
    () => createWidgets(options.widgets ?? [], widgetCallbacks),
    [options.widgets, widgetCallbacks]
  );
  const getTooltip = useMemo(
    () =>
      options.tooltip.show !== false ? buildDeckTooltip(options.tooltip.template ?? DEFAULT_TOOLTIP_TEMPLATE) : null,
    [options.tooltip.show, options.tooltip.template]
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
  if (providerProps.options.basemap.provider === 'google') {
    return <GoogleMap {...providerProps} />;
  }
  return <MaplibreMap {...providerProps} />;
}
