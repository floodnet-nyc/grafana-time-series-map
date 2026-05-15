import React, { useEffect } from 'react';
import { APIProvider, Map } from '@vis.gl/react-google-maps';
import { useMapHashRoute } from '../../../hooks/useMapHashRoute';
import type { MapProviderProps } from '../types';
import { GoogleDeckOverlay } from './GoogleDeckOverlay';
import { GoogleFitBounds } from './GoogleFitBounds';
import { GoogleGeolocateControl } from './GoogleGeolocateControl';
import { GoogleHashRoute } from './GoogleHashRoute';
import { getGoogleColorScheme } from './controlMappings';
import { getInitialViewport } from '../viewState';
import { resolveMapControlSettings } from '../controlSettings';
import type { GoogleControlPosition, MapControlPosition } from 'types';


export function toGooglePosition(position: MapControlPosition, fallback: GoogleControlPosition): GoogleControlPosition {
  switch (position) {
    case 'top-left':
      return 'TOP_LEFT';
    case 'bottom-left':
      return 'BOTTOM_LEFT';
    case 'bottom-right':
      return 'BOTTOM_RIGHT';
    case 'top-right':
    default:
      return fallback;
  }
}

export function getGoogleCameraControlPosition(position: MapControlPosition) {
  return toGooglePosition(position, 'INLINE_START_BLOCK_END');
}

export function getGoogleFullscreenControlPosition(position: MapControlPosition) {
  return toGooglePosition(position, 'TOP_RIGHT');
}


export default function GoogleMap({ width, height, options, deckProps, fitBounds, fitRequestId, onViewportChange }: MapProviderProps) {
  const interactions = options.basemap.interactions ?? {};
  const googleMapOptions = options.basemap.google;
  const controlSettings = resolveMapControlSettings(options);
  const interactive = interactions.interactive ?? true;
  const hashRoutingEnabled = interactions.syncViewToUrl ?? false;
  const [initialHashView, writeHashView] = useMapHashRoute(hashRoutingEnabled);
  const colorScheme = getGoogleColorScheme(googleMapOptions.colorScheme);
  const initialViewport = getInitialViewport(options, initialHashView);

  useEffect(() => {
    onViewportChange?.(initialViewport);
  }, [initialViewport, onViewportChange]);

  const mapProps = {
    defaultCenter: {
      lat: initialViewport.latitude,
      lng: initialViewport.longitude,
    },
    defaultZoom: initialViewport.zoom,
    defaultHeading: initialViewport.bearing,
    defaultTilt: initialViewport.pitch,
    style: { width, height },
    mapId: googleMapOptions.mapId || undefined,
    colorScheme,
    gestureHandling: !interactive ? 'none' : interactions.cooperativeGestures ? 'cooperative' : 'auto',
    keyboardShortcuts: interactive,
    clickableIcons: interactive,
    cameraControl: controlSettings.navigation.enabled,
    // cameraControlOptions: { position: getGoogleCameraControlPosition(controlSettings.navigation.position) },
    fullscreenControl: controlSettings.fullscreen.enabled,
    // fullscreenControlOptions: { position: getGoogleFullscreenControlPosition(controlSettings.fullscreen.position) },
    scaleControl: controlSettings.scale.enabled,
    mapTypeControl: controlSettings.google.mapTypeControl,
    // mapTypeControlOptions: {
    //   position: toGooglePosition(controlSettings.google.mapTypeControlPosition, 'TOP_LEFT'),
    //   style: mapTypeControlStyleValues[controlSettings.google.mapTypeControlStyle],
    // },
    rotateControl: controlSettings.navigation.showCompass,
    // rotateControlOptions: { position: getGoogleCameraControlPosition(controlSettings.navigation.position) },
    streetViewControl: controlSettings.google.streetViewControl,
    // streetViewControlOptions: { position: getGoogleFullscreenControlPosition(controlSettings.google.streetViewControlPosition) },
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
      writeHashView(viewport);
    }
  }

  return (
    <APIProvider apiKey={options.basemap.google.apiKey ?? ''}>
      <Map {...mapProps}>
        <GoogleDeckOverlay {...deckProps} options={options} />
        <GoogleFitBounds disabled={Boolean(initialHashView)} initialHashView={initialHashView} fitBounds={fitBounds} fitRequestId={fitRequestId} options={options} />
        <GoogleHashRoute enabled={hashRoutingEnabled} />
        <GoogleGeolocateControl enabled={controlSettings.geolocate.enabled && interactive} />
      </Map>
    </APIProvider>
  );
}
