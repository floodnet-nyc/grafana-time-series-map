import { useEffect, useRef } from 'react';
import { MapboxOverlay } from '@deck.gl/mapbox';
import type { Layer, PickingInfo } from '@deck.gl/core';
import { useMap } from 'react-map-gl/maplibre';
import type { MapPanelOptions } from '../../../types';
import type { DeckTooltipContent } from '../types';
import { buildDeckEffects } from '../../../utils/deckgl/lighting';
import { buildDeckParameters } from '../../../utils/deckgl/parameters';

interface MaplibreDeckOverlayProps {
  layers: Layer[];
  interleaved: boolean;
  options: MapPanelOptions;
  getTooltip?: ((info: PickingInfo) => DeckTooltipContent) | null;
}

export function MaplibreDeckOverlay({ layers, interleaved, options, getTooltip }: MaplibreDeckOverlayProps) {
  const { current: mapRef } = useMap();
  const overlayRef = useRef<MapboxOverlay | null>(null);
  const effects = buildDeckEffects(options.deckLighting);
  const parameters = buildDeckParameters(options.deckParameters);

  useEffect(() => {
    const map = mapRef?.getMap();
    if (!map) {
      return;
    }

    const overlay = new MapboxOverlay({ interleaved, layers, effects, parameters, getTooltip });
    overlayRef.current = overlay;
    map.addControl(overlay as any);

    return () => {
      map.removeControl(overlay as any);
      overlayRef.current = null;
    };
    // Intentionally run only on mount/unmount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapRef]);

  useEffect(() => {
    const overlay = overlayRef.current;
    if (!overlay) {
      return;
    }

    overlay.setProps({ layers, effects, parameters, getTooltip });
    // if (interleaved) {
    //   mapRef?.getMap()?.triggerRepaint();
    // }
  }, [effects, getTooltip, interleaved, layers, mapRef, parameters]);

  return null;
}
