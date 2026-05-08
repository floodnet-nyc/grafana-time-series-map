import React, { useCallback, useEffect, useRef } from 'react';
import Map, { useMap } from 'react-map-gl/maplibre';
import type { MapRef } from 'react-map-gl/maplibre';
import { MapboxOverlay } from '@deck.gl/mapbox';
import type { Layer } from '@deck.gl/core';
import type { MapPanelOptions } from '../../types';
import 'maplibre-gl/dist/maplibre-gl.css';

const STYLE_URLS: Record<string, string> = {
  'carto-dark': 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
  'carto-light': 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
  osm: 'https://demotiles.maplibre.org/style.json',
};

function OverlayController({ layers, interleaved }: { layers: Layer[]; interleaved: boolean }) {
  const { current: mapRef } = useMap();
  const overlayRef = useRef<MapboxOverlay | null>(null);

  useEffect(() => {
    const map = mapRef?.getMap();
    if (!map) return;
    const overlay = new MapboxOverlay({ interleaved, layers });
    overlayRef.current = overlay;
    map.addControl(overlay as any);
    return () => {
      map.removeControl(overlay as any);
      overlayRef.current = null;
    };
  // Intentionally run only on mount/unmount
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapRef]);

  // Synchronous during render (not useEffect) so deck.gl receives updated layers
  // before the browser paints, matching them to the same RAF cycle.
  // triggerRepaint is required in interleaved mode because MapboxOverlay doesn't
  // notify maplibre of layer changes automatically.
  if (overlayRef.current) {
    overlayRef.current.setProps({ layers });
    if (interleaved) {
      mapRef?.getMap()?.triggerRepaint();
    }
  }

  return null;
}

export interface ViewportSnapshot {
  latitude: number;
  longitude: number;
  zoom: number;
  bearing: number;
  pitch: number;
}

interface MaplibreMapProps {
  width: number;
  height: number;
  options: MapPanelOptions;
  layers: Layer[];
  fitBounds?: [[number, number], [number, number]];
  onViewportChange?: (viewport: ViewportSnapshot) => void;
  interleaved?: boolean;
}

export function MaplibreMap({ width, height, options, layers, fitBounds, onViewportChange, interleaved = true }: MaplibreMapProps) {
  const styleUrl =
    options.maplibreStyle === 'custom'
      ? (options.maplibreStyleUrl ?? STYLE_URLS['carto-dark'])
      : (STYLE_URLS[options.maplibreStyle] ?? STYLE_URLS['carto-dark']);

  const mapRef = useRef<MapRef>(null);

  // When fitBounds changes (data loaded or mode changed), refit the map.
  const prevFitBoundsRef = useRef<string | null>(null);
  useEffect(() => {
    const key = fitBounds ? JSON.stringify(fitBounds) : null;
    if (!fitBounds || key === prevFitBoundsRef.current) return;
    prevFitBoundsRef.current = key;
    const map = mapRef.current?.getMap();
    if (map) {
      map.fitBounds(fitBounds as any, { padding: 48, duration: 800 });
    }
  }, [fitBounds]);

  const handleMoveEnd = useCallback((e: any) => {
    if (!onViewportChange) return;
    const { latitude, longitude, zoom, bearing, pitch } = e.viewState;
    onViewportChange({ latitude, longitude, zoom, bearing, pitch });
  }, [onViewportChange]);

  const initialViewState = fitBounds
    ? { bounds: fitBounds as any, fitBoundsOptions: { padding: 48 } }
    : {
        latitude: options.initialLatitude,
        longitude: options.initialLongitude,
        zoom: options.initialZoom,
        bearing: options.initialBearing ?? 0,
        pitch: options.initialPitch ?? 0,
      };

  return (
    <Map
      ref={mapRef}
      initialViewState={initialViewState}
      style={{ width, height }}
      mapStyle={styleUrl}
      onMoveEnd={handleMoveEnd}
    >
      <OverlayController layers={layers} interleaved={interleaved} />
    </Map>
  );
}
