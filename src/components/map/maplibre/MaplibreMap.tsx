import React, { useCallback, useEffect, useRef } from 'react';
import Map, {
  // AttributionControl,
  FullscreenControl,
  GeolocateControl,
  NavigationControl,
  ScaleControl,
  type MapRef,
} from 'react-map-gl/maplibre';
import { DeckGL, DeckGLProps } from '@deck.gl/react';
import { useMapHashRoute } from '../../../hooks/useMapHashRoute';
import { getFitBoundsKey, getFitBoundsOptions, getInitialViewport } from '../viewState';
import type { MapProviderProps } from '../types';
import { MaplibreDeckOverlay } from './MaplibreDeckOverlay';
import { getMaplibreStyleUrl } from './style';
import { resolveMapControlSettings } from '../controlSettings';
import 'maplibre-gl/dist/maplibre-gl.css';


export default function MaplibreMap({ width, height, options, deckProps, fitBounds, fitRequestId, onViewportChange }: MapProviderProps) {
  const styleUrl = getMaplibreStyleUrl(options.basemap.maplibre.mapStyle, options.basemap.maplibre.mapStyleUrl);
  const controlSettings = resolveMapControlSettings(options);
  const fitBoundsOptions = getFitBoundsOptions(options);
  const controller = true; // We need to enable the controller to allow DeckGL to control the map viewport. Interactions are still controlled by the map's interactive prop.

  const mapRef = useRef<MapRef>(null);
  const prevFitRequestRef = useRef<number>(0); // TODO: this is hacky. Use declarative model
  // TODO: hash routing should be handled at a higher level (MapPanel)
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
    onViewportChange?.(e.viewState);
    writeHashView(e.viewState);
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
  const mapProps = {
    initialViewState,
    style: { width, height },
    mapStyle: styleUrl,
    projection: options.basemap.maplibre.projection ?? 'mercator',
    interactive,
    cooperativeGestures: interactive ? interactions.cooperativeGestures ?? false : false,
    rollEnabled: interactive ? interactions.rollEnabled ?? true : false,
    onMoveEnd: handleMoveEnd,
    attributionControl: { compact: true } as any,
  };


  return (
    controller ? (
      <DeckGL {...deckProps as DeckGLProps} controller initialViewState={initialViewport} onViewStateChange={handleMoveEnd}>
        <Map {...mapProps}>
        </Map>
      </DeckGL>
    ) : (
      <Map ref={mapRef} {...mapProps}>
        <MaplibreDeckOverlay {...deckProps} options={options} />
        {controlSettings.navigation.enabled && (
          <NavigationControl
            position={controlSettings.navigation.position}
            showZoom={controlSettings.navigation.showZoom}
            showCompass={controlSettings.navigation.showCompass}
            visualizePitch={controlSettings.navigation.visualizePitch}
            visualizeRoll={controlSettings.navigation.visualizeRoll}
          />
        )}
        {controlSettings.geolocate.enabled && interactive && (
          <GeolocateControl
            position={controlSettings.geolocate.position}
            trackUserLocation={controlSettings.geolocate.trackUserLocation}
            positionOptions={{ enableHighAccuracy: true }}
          />
        )}
        {controlSettings.fullscreen.enabled && <FullscreenControl position={controlSettings.fullscreen.position} />}
        {controlSettings.scale.enabled && <ScaleControl position="bottom-left" />}
      </Map>
    )

    
  );
}
