import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { APIProvider, Map, limitTiltRange, useMap } from '@vis.gl/react-google-maps';
import type { MapProviderProps, ViewportSnapshot } from '../types';
import { useDeckGLProps } from '../DeckGLMap';
import { GoogleDeckOverlay } from './GoogleDeckOverlay';
import { GoogleFitBounds } from './GoogleFitBounds';
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

function applyGoogleViewState(map: google.maps.Map, next: Record<string, unknown>) {
  const cameraOptions: google.maps.CameraOptions = {};

  const currentCenter = map.getCenter();
  const currentZoom = map.getZoom();
  const currentHeading = map.getHeading();
  const currentTilt = map.getTilt();

  if (typeof next.latitude === 'number' && typeof next.longitude === 'number') {
    cameraOptions.center = { lat: next.latitude, lng: next.longitude };
  } else if (currentCenter) {
    cameraOptions.center = currentCenter.toJSON();
  }
  if (typeof next.delta === 'number' && typeof currentZoom === 'number') {
    cameraOptions.zoom = currentZoom + next.delta;
  } else if (typeof next.zoom === 'number') {
    cameraOptions.zoom = next.zoom;
  }
  if (typeof next.bearing === 'number') {
    cameraOptions.heading = next.bearing;
  } else if (typeof currentHeading === 'number') {
    cameraOptions.heading = currentHeading;
  }
  if (typeof next.pitch === 'number') {
    cameraOptions.tilt = next.pitch;
  } else if (typeof currentTilt === 'number') {
    cameraOptions.tilt = currentTilt;
  }

  map.moveCamera(cameraOptions);
}

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

  return (
    <APIProvider apiKey={options.basemap.google.apiKey ?? ''}>
      <GoogleMapContent
        width={width}
        height={height}
        options={options}
        layers={layers}
        getTooltip={getTooltip}
        widgetCallbacks={widgetCallbacks}
        initialViewState={initialViewState}
        initialViewFromHash={initialViewFromHash}
        fitBounds={fitBounds}
        fitRequestId={fitRequestId}
        onViewportChange={onViewportChange}
        controller={controller}
        viewState={viewState}
        onDeckViewStateChange={handleViewStateChange}
        onWidgetViewStateChange={handleWidgetViewStateChange}
        interactive={interactive}
        interactions={interactions}
        controlSettings={controlSettings}
        sharedMapProps={sharedMapProps}
        themeMode={themeMode}
        onThemeModeChange={setThemeMode}
      />
    </APIProvider>
  );
}

function GoogleMapContent({
  width,
  height,
  options,
  layers,
  getTooltip,
  widgetCallbacks,
  initialViewState,
  initialViewFromHash,
  fitBounds,
  fitRequestId,
  onViewportChange,
  controller,
  viewState,
  onDeckViewStateChange,
  onWidgetViewStateChange,
  interactive,
  interactions,
  controlSettings,
  sharedMapProps,
  themeMode,
  onThemeModeChange,
}: {
  width: number;
  height: number;
  options: MapProviderProps['options'];
  layers: MapProviderProps['layers'];
  getTooltip: MapProviderProps['getTooltip'];
  widgetCallbacks: MapProviderProps['widgetCallbacks'];
  initialViewState: MapProviderProps['initialViewState'];
  initialViewFromHash: MapProviderProps['initialViewFromHash'];
  fitBounds: MapProviderProps['fitBounds'];
  fitRequestId: MapProviderProps['fitRequestId'];
  onViewportChange: MapProviderProps['onViewportChange'];
  controller: boolean;
  viewState: ViewportSnapshot;
  onDeckViewStateChange: (e: any) => void;
  onWidgetViewStateChange: (next: object) => void;
  interactive: boolean;
  interactions: NonNullable<MapProviderProps['options']['basemap']['interactions']>;
  controlSettings: ReturnType<typeof resolveMapControlSettings>;
  sharedMapProps: {
    mapId?: string;
    colorScheme: ReturnType<typeof getGoogleColorScheme>;
    defaultCenter: { lat: number; lng: number };
    defaultZoom: number;
    defaultHeading: number;
    defaultTilt: number;
  };
  themeMode: 'light' | 'dark' | undefined;
  onThemeModeChange: React.Dispatch<React.SetStateAction<'light' | 'dark' | undefined>>;
}) {
  const map = useMap();

  const handleWidgetViewStateChange = useCallback((next: object) => {
    if (controller) {
      onWidgetViewStateChange(next);
      return;
    }

    if (!map) {
      return;
    }

    applyGoogleViewState(map, next as Record<string, unknown>);
  }, [controller, map, onWidgetViewStateChange]);

  const mergedCallbacks = useMemo(() => ({
    ...widgetCallbacks,
    onViewStateChange: handleWidgetViewStateChange,
    resetViewState: initialViewState,
    themeMode,
    onThemeModeChange,
  }), [widgetCallbacks, handleWidgetViewStateChange, initialViewState, themeMode, onThemeModeChange]);

  const deckProps = useDeckGLProps({
    options,
    layers,
    getTooltip,
    widgetCallbacks: mergedCallbacks,
  });

  if (controller) {
    return (
      <div style={{ width, height }}>
      <DeckGL {...deckProps as DeckGLProps} width={width} height={height} controller viewState={viewState} onViewStateChange={onDeckViewStateChange}>
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
          <GoogleFitBounds
            disabled={Boolean(initialViewFromHash)}
            fitBounds={fitBounds}
            fitRequestId={fitRequestId}
            options={options}
            onViewState={handleWidgetViewStateChange}
          />
        </Map>
      </DeckGL>
      </div>
    );
  }

  return (
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
    </Map>
  );
}
