import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { APIProvider, Map, limitTiltRange } from '@vis.gl/react-google-maps';
import type { MapProviderProps } from '../types';
import { useDeckGLProps } from '../DeckGLMap';
import { GoogleDeckOverlay } from './GoogleDeckOverlay';
import { GoogleFitBounds } from './GoogleFitBounds';
import { GoogleGeolocateControl } from './GoogleGeolocateControl';
// import { GoogleMapViewportSync } from './GoogleMapViewportSync';
import {
  getGoogleColorScheme,
  getControlPosition,
  getCameraControlPosition,
  getFullscreenControlPosition,
  mapTypeControlStyleValues,
} from './controlMappings';
import { resolveMapControlSettings } from '../controlSettings';
import DeckGL, { DeckGLProps } from '@deck.gl/react';


export default function GoogleMap({
  width, height, options,
  layers, getTooltip, widgetCallbacks,
  initialViewState, initialViewFromHash,
  fitBounds, fitRequestId,
  onViewportChange,
}: MapProviderProps) {
  const interactions = options.basemap.interactions ?? {};
  const googleMapOptions = options.basemap.google;
  const controlSettings = resolveMapControlSettings(options);
  const interactive = interactions.interactive ?? true;
  const colorScheme = getGoogleColorScheme(googleMapOptions.colorScheme);

  // Whether DeckGL owns the viewport (controller mode) or Google Maps does (overlay mode).
  const controller = options.deck.interleaved !== true;

  // ── Controlled viewState for DeckGL controller mode ─────────────────────────
  const [viewState, setViewState] = useState(initialViewState ?? { latitude: 0, longitude: 0, zoom: 2, bearing: 0, pitch: 0 });

  const handleViewStateChange = useCallback((e: any) => {
    const vs = limitTiltRange(e);
    setViewState(vs);
    onViewportChange?.(vs);
  }, [onViewportChange]);

  const handleWidgetViewStateChange = useCallback((next: object) => {
    setViewState((prev: any) => ({ ...prev, ...next }));
  }, []);

  const [themeMode, setThemeMode] = useState<'light' | 'dark' | undefined>(undefined);

  const mergedCallbacks = useMemo(() => ({
    ...widgetCallbacks,
    onViewStateChange: handleWidgetViewStateChange,
    resetViewState: initialViewState,
    themeMode,
    onThemeModeChange: setThemeMode,
  }), [widgetCallbacks, handleWidgetViewStateChange, initialViewState, themeMode]);

  const deckProps = useDeckGLProps({
    options, layers, getTooltip,
    widgetCallbacks: controller ? mergedCallbacks : widgetCallbacks,
  });

  const latitude = initialViewState?.latitude ?? 0;
  const longitude = initialViewState?.longitude ?? 0;
  const zoom = initialViewState?.zoom ?? 2;
  const bearing = initialViewState?.bearing ?? 0;
  const pitch = initialViewState?.pitch ?? 0;

  useEffect(() => {
    onViewportChange?.({ latitude, longitude, zoom, bearing, pitch });
    // Report initial viewport once on mount only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sharedMapProps = {
    mapId: googleMapOptions.mapId || undefined,
    colorScheme,
    defaultCenter: { lat: latitude, lng: longitude },
    defaultZoom: zoom,
    defaultHeading: bearing,
    defaultTilt: pitch,
  };

  if (controller) {
    return (
      <APIProvider apiKey={options.basemap.google.apiKey ?? ''}>
        <DeckGL {...deckProps as DeckGLProps} controller viewState={viewState} onViewStateChange={handleViewStateChange}>
          <Map
            {...sharedMapProps}
            style={{ width, height }}
            gestureHandling="none"
            keyboardShortcuts={false}
            clickableIcons={false}
            cameraControl={false}
            fullscreenControl={false}
            scaleControl={controlSettings.scale.enabled}
            mapTypeControl={false}
            rotateControl={false}
            streetViewControl={false}
          >
            {/* <GoogleMapViewportSync {...viewState} /> */}
            <GoogleFitBounds
              disabled={Boolean(initialViewFromHash)}
              fitBounds={fitBounds}
              fitRequestId={fitRequestId}
              options={options}
              onViewState={handleWidgetViewStateChange}
            />
            <GoogleGeolocateControl enabled={controlSettings.geolocate.enabled && interactive} />
          </Map>
        </DeckGL>
      </APIProvider>
    );
  }

  return (
    <APIProvider apiKey={options.basemap.google.apiKey ?? ''}>
      <Map
        {...sharedMapProps}
        style={{ width, height }}
        gestureHandling={!interactive ? 'none' : interactions.cooperativeGestures ? 'cooperative' : 'auto'}
        keyboardShortcuts={interactive}
        clickableIcons={interactive}
        cameraControl={controlSettings.navigation.enabled}
        cameraControlOptions={{ position: getControlPosition(getCameraControlPosition(controlSettings.navigation.position), 'INLINE_START_BLOCK_END') }}
        fullscreenControl={controlSettings.fullscreen.enabled}
        fullscreenControlOptions={{ position: getControlPosition(getFullscreenControlPosition(controlSettings.fullscreen.position), 'TOP_RIGHT') }}
        scaleControl={controlSettings.scale.enabled}
        mapTypeControl={controlSettings.google.mapTypeControl}
        mapTypeControlOptions={{
          position: getControlPosition(controlSettings.google.mapTypeControlPosition, 'TOP_LEFT'),
          style: mapTypeControlStyleValues[controlSettings.google.mapTypeControlStyle],
        }}
        rotateControl={controlSettings.navigation.showCompass}
        rotateControlOptions={{ position: getControlPosition(getCameraControlPosition(controlSettings.navigation.position), 'INLINE_START_BLOCK_END') }}
        streetViewControl={controlSettings.google.streetViewControl}
        streetViewControlOptions={{ position: getControlPosition(controlSettings.google.streetViewControlPosition, 'RIGHT_BOTTOM') }}
        tiltInteractionEnabled={interactions.rollEnabled}
        onCameraChanged={(event: any) => {
          onViewportChange?.({
            latitude: event.detail.center.lat,
            longitude: event.detail.center.lng,
            zoom: event.detail.zoom,
            bearing: event.detail.heading,
            pitch: event.detail.tilt,
          });
        }}
      >
        <GoogleDeckOverlay {...deckProps} options={options} />
        <GoogleFitBounds disabled={Boolean(initialViewFromHash)} fitBounds={fitBounds} fitRequestId={fitRequestId} options={options} />
        <GoogleGeolocateControl enabled={controlSettings.geolocate.enabled && interactive} />
      </Map>
    </APIProvider>
  );
}
