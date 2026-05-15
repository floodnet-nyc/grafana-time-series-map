import { useEffect, useMemo } from 'react';
import { MapboxOverlay, MapboxOverlayProps } from '@deck.gl/mapbox';
import { useMap } from 'react-map-gl/maplibre';
import type { MapPanelOptions } from '../../../types';

export type MaplibreDeckOverlayProps = MapboxOverlayProps & { options: MapPanelOptions; };

export function MaplibreDeckOverlay({ options, ...props }: MaplibreDeckOverlayProps) {
  const { current: mapRef } = useMap();

  const overlay = useMemo(() => {
    return new MapboxOverlay(props);
    // Intentionally run only on mount/unmount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef?.getMap();
    if (!map || !overlay) { return; }
    map.addControl(overlay as any);
    return () => { map.removeControl(overlay as any); };
  }, [mapRef, overlay]);

  useEffect(() => overlay?.setProps(props), [overlay, props]);

  return null;
}
