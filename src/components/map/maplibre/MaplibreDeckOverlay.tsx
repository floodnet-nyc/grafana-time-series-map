import { useEffect, useRef } from 'react';
import { MapboxOverlay, MapboxOverlayProps } from '@deck.gl/mapbox';
import { useMap } from 'react-map-gl/maplibre';
import type { MapPanelOptions } from '../../../types';
import { buildDeckEffects } from '../../../utils/deckgl/lighting';
import { buildDeckParameters } from '../../../utils/deckgl/parameters';
import { createWidgets } from '../../../widgets/_all';
import {LightGlassTheme} from '@deck.gl/widgets';

export type MaplibreDeckOverlayProps = MapboxOverlayProps & { options: MapPanelOptions; };

export function MaplibreDeckOverlay({ options, ...props }: MaplibreDeckOverlayProps) {
  const { current: mapRef } = useMap();
  const overlayRef = useRef<MapboxOverlay | null>(null);
  const effects = buildDeckEffects(options.deck.lighting);
  const parameters = buildDeckParameters(options.deck.parameters);
  const widgets = createWidgets(options.widgets ?? []);
  props = { ...props, effects, parameters, widgets, style: LightGlassTheme };

  useEffect(() => {
    const map = mapRef?.getMap();
    if (!map) { return; }

    const overlay = new MapboxOverlay(props);
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
    if (!overlay) { return; }
    overlay.setProps(props);
  }, [props]);

  return null;
}
