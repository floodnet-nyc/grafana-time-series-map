import React, { useCallback, useMemo, useState } from 'react';
import { APIProvider, Map, limitTiltRange, useMap } from '@vis.gl/react-google-maps';
import type { MapProviderProps, ViewportSnapshot, WidgetViewStateChange } from '../types';
import { useDeckGLProps } from '../DeckGLMap';
import { GoogleDeckOverlay } from './GoogleDeckOverlay';
import { GoogleFitBounds } from './GoogleFitBounds';
// import { GoogleMapViewportSync } from './GoogleMapViewportSync';
import {
  getGoogleColorScheme,
  getControlPosition,
  mapTypeControlStyleValues,
} from './controlMappings';
import { resolveMapControlSettings } from '../controlSettings';
import { resolveGoogleNativeProps } from '../../../widgets/_all';
import DeckGL, { DeckGLProps } from '@deck.gl/react';
import {
  applyWidgetViewStateChange,
  useInitialViewportReport,
  useProviderThemeMode,
  useProviderWidgetCallbacks,
} from '../providerState';

type GoogleMapControlProps = Pick<
  google.maps.MapOptions,
  | 'zoomControl'
  | 'zoomControlOptions'
  | 'cameraControl'
  | 'cameraControlOptions'
  | 'fullscreenControl'
  | 'fullscreenControlOptions'
  | 'scaleControl'
  | 'rotateControl'
  | 'rotateControlOptions'
  | 'mapTypeControl'
  | 'mapTypeControlOptions'
>;

function applyGoogleViewState(map: google.maps.Map, next: WidgetViewStateChange) {
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

export default function GoogleMap(props: MapProviderProps) {
  return (
    <APIProvider apiKey={props.options.basemap.google.apiKey ?? ''}>
      <GoogleMapInner {...props} />
    </APIProvider>
  );
}

function GoogleMapInner({
  width, height, options,
  layers, widgetCallbacks,
  initialViewState, initialViewFromHash,
  fitBounds, fitRequestId,
  onViewportChange,
}: MapProviderProps) {
  const map = useMap();
  const interactions = options.basemap.interactions ?? {};
  const googleMapOptions = options.basemap.google;
  const controlSettings = resolveMapControlSettings(options);
  const interactive = interactions.interactive ?? true;

  // Whether DeckGL owns the viewport (controller mode) or Google Maps does (overlay mode).
  const controller = options.deck.interleaved !== true;

  // ── Controlled viewState for DeckGL controller mode ─────────────────────────
  const [viewState, setViewState] = useState<ViewportSnapshot>(initialViewState ?? { latitude: 0, longitude: 0, zoom: 2, bearing: 0, pitch: 0 });

  const handleViewStateChange = useCallback((e: any) => {
    const vs = limitTiltRange(e);
    setViewState(vs);
    onViewportChange?.(vs);
  }, [onViewportChange]);

  const handleWidgetViewStateChange = useCallback((next: WidgetViewStateChange) => {
    if (controller) {
      setViewState((prev) => applyWidgetViewStateChange(prev, next));
      return;
    }
    if (!map) {
      return;
    }
    applyGoogleViewState(map, next);
  }, [controller, map]);

  const { themeMode, setThemeMode } = useProviderThemeMode(options.theme?.mode);
  const colorScheme = getGoogleColorScheme(themeMode);
  const mergedCallbacks = useProviderWidgetCallbacks({
    widgetCallbacks,
    onViewStateChange: handleWidgetViewStateChange,
    resetViewState: initialViewState,
    themeMode,
    onThemeModeChange: setThemeMode,
  });

  const deckProps = useDeckGLProps({
    options,
    layers,
    widgetCallbacks: mergedCallbacks,
  });

  const googleNativeProps = useMemo(
    () => resolveGoogleNativeProps(options.widgets ?? []),
    [options.widgets]
  );

  const googleControlProps = useMemo<GoogleMapControlProps>(() => ({
    zoomControl: googleNativeProps.zoomControl ?? false,
    zoomControlOptions: googleNativeProps.zoomControlOptions,
    cameraControl: googleNativeProps.cameraControl ?? false,
    cameraControlOptions: googleNativeProps.cameraControlOptions,
    fullscreenControl: googleNativeProps.fullscreenControl ?? false,
    fullscreenControlOptions: googleNativeProps.fullscreenControlOptions,
    scaleControl: googleNativeProps.scaleControl ?? false,
    rotateControl: googleNativeProps.rotateControl ?? false,
    rotateControlOptions: googleNativeProps.rotateControlOptions,
    mapTypeControl: controlSettings.google.mapTypeControl ?? false,
    mapTypeControlOptions: {
      position: getControlPosition(controlSettings.google.mapTypeControlPosition, 'TOP_LEFT'),
      style: mapTypeControlStyleValues[controlSettings.google.mapTypeControlStyle],
    },
  }), [googleNativeProps, controlSettings]);

  const latitude = initialViewState?.latitude ?? 0;
  const longitude = initialViewState?.longitude ?? 0;
  const zoom = initialViewState?.zoom ?? 2;
  const bearing = initialViewState?.bearing ?? 0;
  const pitch = initialViewState?.pitch ?? 0;

  useInitialViewportReport(initialViewState, { latitude, longitude, zoom, bearing, pitch }, onViewportChange);

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
      <div style={{ width, height }}>
      <DeckGL {...deckProps as DeckGLProps} width={width} height={height} controller viewState={viewState} onViewStateChange={handleViewStateChange}>
        <Map
          {...sharedMapProps}
          style={{ width, height }}
          gestureHandling="none"
          keyboardShortcuts={false}
          clickableIcons={false}
          zoomControl={false}
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
      controlSize={25}
      {...googleControlProps}
      // cameraControl={true}
      // cameraControlOptions={{position: getControlPosition('TOP_RIGHT', 'TOP_RIGHT')}}
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
