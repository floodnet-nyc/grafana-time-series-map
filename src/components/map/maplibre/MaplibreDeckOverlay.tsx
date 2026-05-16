import { useEffect, useMemo } from 'react';
import { MapboxOverlay, MapboxOverlayProps } from '@deck.gl/mapbox';
import { useMap } from 'react-map-gl/maplibre';
import type { MapPanelOptions } from '../../../types';
import type { Widget } from '@deck.gl/core';
import { useMaplibreWidgetControls } from './WidgetControl';

export type MaplibreDeckOverlayProps = MapboxOverlayProps & { options: MapPanelOptions; };

export function MaplibreDeckOverlay({ options, ...props }: MaplibreDeckOverlayProps) {
  const { current: mapRef } = useMap();
  const widgets = useMaplibreWidgetControls(props.widgets as Widget[] | undefined);

  const overlayProps = useMemo(() => ({ ...props, widgets }), [props, widgets]);

  const overlay = useMemo(() => {
    return new MapboxOverlay(overlayProps);
    // Intentionally run only on mount/unmount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef?.getMap();
    if (!map || !overlay) { return; }
    map.addControl(overlay as any);
    return () => { map.removeControl(overlay as any); };
  }, [mapRef, overlay]);

  useEffect(() => overlay?.setProps(overlayProps), [overlay, overlayProps]);

  return null;
}
