import React, { useCallback, useEffect, useRef } from 'react';
import Map, {
  FullscreenControl,
  GeolocateControl,
  NavigationControl,
  ScaleControl,
  type MapRef,
} from 'react-map-gl/maplibre';
import { useMapHashRoute } from '../../hooks/useMapHashRoute';
import { FIT_BOUNDS_PADDING_PX, getFitBoundsKey, getInitialViewport } from './viewState';
import type { MapProviderProps } from './providerTypes';
import { MaplibreDeckOverlay } from './maplibre/MaplibreDeckOverlay';
import { getMaplibreStyleUrl } from './maplibre/style';
import 'maplibre-gl/dist/maplibre-gl.css';
export function MaplibreMap({ width, height, options, layers, fitBounds, onViewportChange, interleaved = true }: MapProviderProps) {
  const styleUrl = getMaplibreStyleUrl(options.maplibreStyle, options.maplibreStyleUrl);

  const mapRef = useRef<MapRef>(null);
  const hashRoutingEnabled = options.interactions?.syncViewToUrl ?? false;
  const [hashInitialView, writeHashView] = useMapHashRoute(hashRoutingEnabled);

  // When fitBounds changes (data loaded or mode changed), refit the map.
  const prevFitBoundsRef = useRef<string | null>(null);
  useEffect(() => {
    if (hashInitialView) {
      return;
    }
    const key = getFitBoundsKey(fitBounds);
    if (!fitBounds || key === prevFitBoundsRef.current) {
      return;
    }
    prevFitBoundsRef.current = key;
    const map = mapRef.current?.getMap();
    if (map) {
      map.fitBounds(fitBounds as any, { padding: FIT_BOUNDS_PADDING_PX, duration: 800 });
    }
  }, [fitBounds, hashInitialView]);

  const handleMoveEnd = useCallback((e: any) => {
    const { latitude, longitude, zoom, bearing, pitch } = e.viewState;
    const viewport = { latitude, longitude, zoom, bearing, pitch };
    onViewportChange?.(viewport);
    writeHashView(viewport);
  }, [onViewportChange, writeHashView]);

  const initialViewport = getInitialViewport(options, hashInitialView);
  const initialViewState = hashInitialView
    ? initialViewport
    : fitBounds
    ? { bounds: fitBounds as any, fitBoundsOptions: { padding: FIT_BOUNDS_PADDING_PX } }
    : initialViewport;
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
      <MaplibreDeckOverlay layers={layers} interleaved={interleaved} options={options} />
    </Map>
  );
}
