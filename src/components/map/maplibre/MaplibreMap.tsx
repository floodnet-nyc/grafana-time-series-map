import React, { useCallback, useEffect, useRef } from 'react';
import Map, {
  AttributionControl,
  // FullscreenControl,
  GeolocateControl,
  // NavigationControl,
  // ScaleControl,
  type MapRef,
} from 'react-map-gl/maplibre';
import { useMapHashRoute } from '../../../hooks/useMapHashRoute';
import { getFitBoundsKey, getFitBoundsOptions, getInitialViewport } from '../viewState';
import type { MapProviderProps } from '../types';
import { MaplibreDeckOverlay } from './MaplibreDeckOverlay';
import { getMaplibreStyleUrl } from './style';
import { resolveMapControlSettings } from '../controlSettings';
import 'maplibre-gl/dist/maplibre-gl.css';


export default function MaplibreMap({ width, height, options, layers, getTooltip, fitBounds, fitRequestId, onViewportChange, interleaved = true }: MapProviderProps) {
  const styleUrl = getMaplibreStyleUrl(options.basemap.maplibre.mapStyle, options.basemap.maplibre.mapStyleUrl);
  const controlSettings = resolveMapControlSettings(options);
  const fitBoundsOptions = getFitBoundsOptions(options);

  const mapRef = useRef<MapRef>(null);
  const prevFitRequestRef = useRef<number>(0);
  const hashRoutingEnabled = options.basemap.interactions?.syncViewToUrl ?? false;
  const [hashInitialView, writeHashView] = useMapHashRoute(hashRoutingEnabled);

  // When fitBounds changes (data loaded or mode changed), refit the map.
  const prevFitBoundsRef = useRef<string | null>(null);
  useEffect(() => {
    if (hashInitialView) {
      return;
    }
    const key = getFitBoundsKey(fitBounds);
    const forcedFit = Boolean(fitRequestId && fitRequestId !== prevFitRequestRef.current);
    if (!fitBounds || (key === prevFitBoundsRef.current && !forcedFit)) {
      return;
    }
    prevFitBoundsRef.current = key;
    if (fitRequestId) {
      prevFitRequestRef.current = fitRequestId;
    }
    const map = mapRef.current?.getMap();
    if (map) {
      map.fitBounds(fitBounds as any, { ...fitBoundsOptions, duration: 800 });
    }
  }, [fitBounds, fitBoundsOptions, fitRequestId, hashInitialView]);

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
    ? { bounds: fitBounds as any, fitBoundsOptions }
    : initialViewport;
  useEffect(() => {
    onViewportChange?.(initialViewport);
  }, [initialViewport, onViewportChange]);
  const interactions = options.basemap.interactions ?? {};
  const interactive = interactions.interactive ?? true;
  return (
    <Map
      ref={mapRef}
      initialViewState={initialViewState}
      style={{ width, height }}
      mapStyle={styleUrl}
      projection={options.basemap.maplibre.projection ?? 'mercator'}
      interactive={interactive}
      cooperativeGestures={interactive ? interactions.cooperativeGestures ?? false : false}
      rollEnabled={interactive ? interactions.rollEnabled ?? false : false}
      onMoveEnd={handleMoveEnd}
      attributionControl={false}
    >
      <AttributionControl compact />
      {/* {controlSettings.navigation.enabled && (
        <NavigationControl
          position={controlSettings.navigation.position}
          showZoom={controlSettings.navigation.showZoom}
          showCompass={controlSettings.navigation.showCompass}
          visualizePitch={controlSettings.navigation.visualizePitch}
          visualizeRoll={controlSettings.navigation.visualizeRoll}
        />
      )} */}
      {controlSettings.geolocate.enabled && interactive && (
        <GeolocateControl
          position={controlSettings.geolocate.position}
          trackUserLocation={controlSettings.geolocate.trackUserLocation}
          positionOptions={{ enableHighAccuracy: true }}
        />
      )}
      {/* {controlSettings.fullscreen.enabled && <FullscreenControl position={controlSettings.fullscreen.position} />}
      {controlSettings.scale.enabled && <ScaleControl position="bottom-left" />} */}
      <MaplibreDeckOverlay layers={layers} getTooltip={getTooltip ?? undefined} interleaved={interleaved} options={options} />
    </Map>
  );
}
