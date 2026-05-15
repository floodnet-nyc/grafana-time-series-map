import React, { useCallback, useEffect, useRef, useState } from 'react';
import Map, {
  // AttributionControl,
  FullscreenControl,
  GeolocateControl,
  NavigationControl,
  ScaleControl,
  type MapRef,
} from 'react-map-gl/maplibre';
import { DeckGL, type DeckGLProps } from '@deck.gl/react';
import type { MapProviderProps } from '../types';
import { MaplibreDeckOverlay } from './MaplibreDeckOverlay';
import { MaplibreFitBounds } from './MaplibreFitBounds';
import { getMaplibreStyleUrl } from './style';
import { resolveMapControlSettings } from '../controlSettings';
import 'maplibre-gl/dist/maplibre-gl.css';


export default function MaplibreMap({ width, height, options, deckProps, initialViewState, initialViewFromHash, fitBounds, fitRequestId, onViewportChange }: MapProviderProps) {
  const styleUrl = getMaplibreStyleUrl(options.basemap.maplibre.mapStyle, options.basemap.maplibre.mapStyleUrl);
  const controlSettings = resolveMapControlSettings(options);

  const interactions = options.basemap.interactions ?? {};
  const interactive = interactions.interactive ?? true;

  // Whether DeckGL owns the viewport (controller mode) or MapLibre does (overlay/interleaved mode).
  const controller = options.deck.interleaved !== true;

  // ── Controlled viewState for DeckGL controller mode ─────────────────────────
  const [viewState, setViewState] = useState(initialViewState ?? { latitude: 0, longitude: 0, zoom: 2, bearing: 0, pitch: 0 });

  const handleViewStateChange = useCallback(({ viewState: next }: any) => {
    setViewState(next);
    onViewportChange?.(next);
  }, [onViewportChange]);

  const handleFitViewState = useCallback((next: object) => {
    setViewState((prev: any) => ({ ...prev, ...next }));
  }, []);

  // ── Overlay (non-controller) mode ────────────────────────────────────────────
  const mapRef = useRef<MapRef>(null);

  const handleMoveEnd = useCallback((e: any) => {
    onViewportChange?.(e.viewState);
  }, [onViewportChange]);

  useEffect(() => {
    onViewportChange?.(initialViewState ?? viewState);
    // Report initial viewport once on mount only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const mapProps = {
    style: { width, height },
    mapStyle: styleUrl,
    projection: options.basemap.maplibre.projection ?? 'mercator',
    interactive,
    cooperativeGestures: interactive ? interactions.cooperativeGestures ?? false : false,
    rollEnabled: interactive ? interactions.rollEnabled ?? true : false,
    attributionControl: { compact: true } as any,
  };

  const controls = (
    <>
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
    </>
  );

  if (controller) {
    return (
      <DeckGL {...deckProps as DeckGLProps} controller viewState={viewState} onViewStateChange={handleViewStateChange}>
        <Map {...mapProps}>
          <MaplibreFitBounds
            disabled={Boolean(initialViewFromHash)}
            fitBounds={fitBounds}
            fitRequestId={fitRequestId}
            options={options}
            onViewState={handleFitViewState}
          />
          {controls}
        </Map>
      </DeckGL>
    );
  }

  return (
    <Map ref={mapRef} {...mapProps} initialViewState={initialViewState} onMoveEnd={handleMoveEnd}>
      <MaplibreDeckOverlay {...deckProps} options={options} />
      <MaplibreFitBounds
        disabled={Boolean(initialViewFromHash)}
        fitBounds={fitBounds}
        fitRequestId={fitRequestId}
        options={options}
      />
      {controls}
    </Map>
  );
}
