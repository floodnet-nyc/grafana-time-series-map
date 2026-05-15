import React, { useEffect } from 'react';
import { APIProvider, Map } from '@vis.gl/react-google-maps';
import type { MapProviderProps } from '../types';
import { GoogleDeckOverlay } from './GoogleDeckOverlay';
import { GoogleFitBounds } from './GoogleFitBounds';
import { GoogleGeolocateControl } from './GoogleGeolocateControl';
import {
  getGoogleColorScheme,
  getControlPosition,
  getCameraControlPosition,
  getFullscreenControlPosition,
  mapTypeControlStyleValues,
} from './controlMappings';
import { resolveMapControlSettings } from '../controlSettings';


export default function GoogleMap({ width, height, options, deckProps, initialViewState, initialViewFromHash, fitBounds, fitRequestId, onViewportChange }: MapProviderProps) {
  const interactions = options.basemap.interactions ?? {};
  const googleMapOptions = options.basemap.google;
  const controlSettings = resolveMapControlSettings(options);
  const interactive = interactions.interactive ?? true;
  const colorScheme = getGoogleColorScheme(googleMapOptions.colorScheme);

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

  const mapProps = {
    defaultCenter: { lat: latitude, lng: longitude },
    defaultZoom: zoom,
    defaultHeading: bearing,
    defaultTilt: pitch,
    style: { width, height },
    mapId: googleMapOptions.mapId || undefined,
    colorScheme,
    gestureHandling: !interactive ? 'none' : interactions.cooperativeGestures ? 'cooperative' : 'auto',
    keyboardShortcuts: interactive,
    clickableIcons: interactive,
    cameraControl: controlSettings.navigation.enabled,
    cameraControlOptions: { position: getControlPosition(getCameraControlPosition(controlSettings.navigation.position), 'INLINE_START_BLOCK_END') },
    fullscreenControl: controlSettings.fullscreen.enabled,
    fullscreenControlOptions: { position: getControlPosition(getFullscreenControlPosition(controlSettings.fullscreen.position), 'TOP_RIGHT') },
    scaleControl: controlSettings.scale.enabled,
    mapTypeControl: controlSettings.google.mapTypeControl,
    mapTypeControlOptions: {
      position: getControlPosition(controlSettings.google.mapTypeControlPosition, 'TOP_LEFT'),
      style: mapTypeControlStyleValues[controlSettings.google.mapTypeControlStyle],
    },
    rotateControl: controlSettings.navigation.showCompass,
    rotateControlOptions: { position: getControlPosition(getCameraControlPosition(controlSettings.navigation.position), 'INLINE_START_BLOCK_END') },
    streetViewControl: controlSettings.google.streetViewControl,
    streetViewControlOptions: { position: getControlPosition(controlSettings.google.streetViewControlPosition, 'RIGHT_BOTTOM') },
    tiltInteractionEnabled: interactions.rollEnabled,
    onCameraChanged: (event: any) => {
      const viewport = {
        latitude: event.detail.center.lat,
        longitude: event.detail.center.lng,
        zoom: event.detail.zoom,
        bearing: event.detail.heading,
        pitch: event.detail.tilt,
      };
      onViewportChange?.(viewport);
    },
  };

  return (
    <APIProvider apiKey={options.basemap.google.apiKey ?? ''}>
      <Map {...mapProps}>
        <GoogleDeckOverlay {...deckProps} options={options} />
        <GoogleFitBounds disabled={Boolean(initialViewFromHash)} fitBounds={fitBounds} fitRequestId={fitRequestId} options={options} />
        <GoogleGeolocateControl enabled={controlSettings.geolocate.enabled && interactive} />
      </Map>
    </APIProvider>
  );
}
