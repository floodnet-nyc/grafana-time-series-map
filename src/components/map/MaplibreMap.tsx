import React, { useEffect, useRef } from 'react';
import Map, { useMap } from 'react-map-gl/maplibre';
import { MapboxOverlay } from '@deck.gl/mapbox';
import type { Layer } from '@deck.gl/core';
import type { MapPanelOptions } from '../../types';
import 'maplibre-gl/dist/maplibre-gl.css';

const STYLE_URLS: Record<string, string> = {
  'carto-dark': 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
  'carto-light': 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
  osm: 'https://demotiles.maplibre.org/style.json',
};

function OverlayController({ layers }: { layers: Layer[] }) {
  const { current: mapRef } = useMap();
  const overlayRef = useRef<MapboxOverlay | null>(null);

  useEffect(() => {
    const map = mapRef?.getMap();
    if (!map) return;
    const overlay = new MapboxOverlay({ interleaved: true, layers });
    overlayRef.current = overlay;
    map.addControl(overlay as any);
    return () => {
      map.removeControl(overlay as any);
      overlayRef.current = null;
    };
  // Intentionally run only on mount/unmount
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapRef]);

  // Update layers on every render; triggerRepaint is required because MapboxOverlay in interleaved
  // mode doesn't notify maplibre of layer changes, so the map won't repaint otherwise.
  useEffect(() => {
    if (overlayRef.current) {
      overlayRef.current.setProps({ layers });
      mapRef?.getMap()?.triggerRepaint();
    }
  });

  return null;
}

interface MaplibreMapProps {
  width: number;
  height: number;
  options: MapPanelOptions;
  layers: Layer[];
}

export function MaplibreMap({ width, height, options, layers }: MaplibreMapProps) {
  const styleUrl =
    options.maplibreStyle === 'custom'
      ? (options.maplibreStyleUrl ?? STYLE_URLS['carto-dark'])
      : (STYLE_URLS[options.maplibreStyle] ?? STYLE_URLS['carto-dark']);

  return (
    <Map
      initialViewState={{
        latitude: options.initialLatitude,
        longitude: options.initialLongitude,
        zoom: options.initialZoom,
      }}
      style={{ width, height }}
      mapStyle={styleUrl}
    >
      <OverlayController layers={layers} />
    </Map>
  );
}
