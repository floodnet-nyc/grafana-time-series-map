import React, { useCallback, useEffect, useRef } from 'react';
import Map, {
  FullscreenControl,
  GeolocateControl,
  NavigationControl,
  ScaleControl,
  type MapRef,
  useMap,
} from 'react-map-gl/maplibre';
import { MapboxOverlay } from '@deck.gl/mapbox';
import type { Layer } from '@deck.gl/core';
import type { MapPanelOptions } from '../../types';
import { useMapHashRoute } from '../../hooks/useMapHashRoute';
import { buildDeckParameters } from '../../utils/deckgl/parameters';
import 'maplibre-gl/dist/maplibre-gl.css';

const STYLE_URLS: Record<string, string> = {
  'carto-dark': 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
  'carto-light': 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
  osm: 'https://demotiles.maplibre.org/style.json',
};

function OverlayController({ layers, interleaved, options }: { layers: Layer[]; interleaved: boolean; options: MapPanelOptions }) {
  const { current: mapRef } = useMap();
  const overlayRef = useRef<MapboxOverlay | null>(null);
  const parameters = buildDeckParameters(options.deckParameters);

  useEffect(() => {
    const map = mapRef?.getMap();
    if (!map) {
      return;
    }
    const overlay = new MapboxOverlay({ interleaved, layers, parameters });
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
    overlay.setProps({ layers, parameters });
    if (interleaved) {
      mapRef?.getMap()?.triggerRepaint();
    }
  }, [interleaved, layers, mapRef, parameters]);

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
  const hashRoutingEnabled = options.interactions?.syncViewToUrl ?? false;
  const { initialView: hashInitialView, writeHashView } = useMapHashRoute(hashRoutingEnabled, (view) => {
    mapRef.current?.getMap().jumpTo({
      center: [view.longitude, view.latitude],
      zoom: view.zoom,
      bearing: view.bearing,
      pitch: view.pitch,
    });
  });

  // When fitBounds changes (data loaded or mode changed), refit the map.
  const prevFitBoundsRef = useRef<string | null>(null);
  useEffect(() => {
    if (hashInitialView) {
      return;
    }
    const key = fitBounds ? JSON.stringify(fitBounds) : null;
    if (!fitBounds || key === prevFitBoundsRef.current) {
      return;
    }
    prevFitBoundsRef.current = key;
    const map = mapRef.current?.getMap();
    if (map) {
      map.fitBounds(fitBounds as any, { padding: 48, duration: 800 });
    }
  }, [fitBounds, hashInitialView]);

  const handleMoveEnd = useCallback((e: any) => {
    const { latitude, longitude, zoom, bearing, pitch } = e.viewState;
    const viewport = { latitude, longitude, zoom, bearing, pitch };
    onViewportChange?.(viewport);
    writeHashView(viewport);
  }, [onViewportChange, writeHashView]);

  const initialViewState = hashInitialView
    ? {
        latitude: hashInitialView.latitude,
        longitude: hashInitialView.longitude,
        zoom: hashInitialView.zoom,
        bearing: hashInitialView.bearing,
        pitch: hashInitialView.pitch,
      }
    : fitBounds
    ? { bounds: fitBounds as any, fitBoundsOptions: { padding: 48 } }
    : {
        latitude: options.initialLatitude,
        longitude: options.initialLongitude,
        zoom: options.initialZoom,
        bearing: options.initialBearing ?? 0,
        pitch: options.initialPitch ?? 0,
      };
  const interactions = options.interactions ?? {};
  const controls = options.controls ?? {};
  const maplibreControls = options.maplibreControls ?? {};
  const interactive = interactions.interactive ?? true;
  const showNavigationControl = options.controls?.navigationControl ?? false;
  return (
    <Map
      ref={mapRef}
      initialViewState={initialViewState}
      style={{ width, height }}
      mapStyle={styleUrl}
      projection={options.maplibreProjection ?? 'mercator'}
      interactive={interactive}
      cooperativeGestures={interactive ? interactions.cooperativeGestures ?? false : false}
      rollEnabled={interactive ? interactions.rollEnabled ?? false : false}
      onMoveEnd={handleMoveEnd}
    >
      {showNavigationControl && (
        <NavigationControl
          position="top-right"
          showZoom={maplibreControls.navigationShowZoom ?? true}
          showCompass={maplibreControls.navigationShowCompass ?? true}
          visualizePitch={maplibreControls.navigationVisualizePitch ?? false}
          visualizeRoll={maplibreControls.navigationVisualizeRoll ?? false}
        />
      )}
      {(controls.geolocateControl || maplibreControls.geolocateControl) && interactive && (
        <GeolocateControl
          position="top-right"
          trackUserLocation={maplibreControls.geolocateTrackUserLocation ?? false}
          positionOptions={{ enableHighAccuracy: true }}
        />
      )}
      {controls.fullscreenControl && <FullscreenControl position="top-right" />}
      {controls.scaleControl && <ScaleControl position="bottom-left" />}
      <OverlayController layers={layers} interleaved={interleaved} options={options} />
    </Map>
  );
}
