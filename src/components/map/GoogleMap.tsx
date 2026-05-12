import React from 'react';
import { APIProvider, Map } from '@vis.gl/react-google-maps';
import { useMapHashRoute } from '../../hooks/useMapHashRoute';
import type { MapProviderProps } from './providerTypes';
import { GoogleDeckOverlay } from './google/GoogleDeckOverlay';
import { GoogleFitBounds } from './google/GoogleFitBounds';
import { GoogleGeolocateControl } from './google/GoogleGeolocateControl';
import { GoogleHashRoute } from './google/GoogleHashRoute';
import { getControlPosition, getGoogleColorScheme, mapTypeControlStyleValues } from './google/controlMappings';
import { getInitialViewport } from './viewState';

export function GoogleMap({ width, height, options, layers, fitBounds, interleaved = true, onViewportChange }: MapProviderProps) {
  const interactions = options.interactions ?? {};
  const googleMapOptions = options.googleMapOptions ?? {};
  const interactive = interactions.interactive ?? true;
  const hashRoutingEnabled = interactions.syncViewToUrl ?? false;
  const [initialHashView, writeHashView] = useMapHashRoute(hashRoutingEnabled);
  const cameraControl = options.controls?.navigationControl;
  const geolocateControl = options.controls?.geolocateControl ?? false;
  const fullscreenControl = options.controls?.fullscreenControl;
  const scaleControl = options.controls?.scaleControl;
  const colorScheme = getGoogleColorScheme(googleMapOptions.colorScheme);
  const initialViewport = getInitialViewport(options, initialHashView);

  return (
    <APIProvider apiKey={options.googleMapsApiKey ?? ''}>
      <Map
        defaultCenter={{
          lat: initialViewport.latitude,
          lng: initialViewport.longitude,
        }}
        defaultZoom={initialViewport.zoom}
        defaultHeading={initialViewport.bearing}
        defaultTilt={initialViewport.pitch}
        style={{ width, height }}
        mapId={options.googleMapsMapId || undefined}
        colorScheme={colorScheme}
        gestureHandling={!interactive ? 'none' : interactions.cooperativeGestures ? 'cooperative' : 'auto'}
        keyboardShortcuts={interactive}
        clickableIcons={interactive}
        cameraControl={cameraControl}
        cameraControlOptions={{ position: getControlPosition(googleMapOptions.cameraControlPosition, 'INLINE_START_BLOCK_END') }}
        fullscreenControl={fullscreenControl}
        fullscreenControlOptions={{ position: getControlPosition(googleMapOptions.fullscreenControlPosition, 'TOP_RIGHT') }}
        scaleControl={scaleControl}
        mapTypeControl={googleMapOptions.mapTypeControl}
        mapTypeControlOptions={{
          position: getControlPosition(googleMapOptions.mapTypeControlPosition, 'TOP_LEFT'),
          style: mapTypeControlStyleValues[googleMapOptions.mapTypeControlStyle ?? 'DEFAULT'],
        }}
        streetViewControl={googleMapOptions.streetViewControl}
        streetViewControlOptions={{ position: getControlPosition(googleMapOptions.streetViewControlPosition, 'RIGHT_BOTTOM') }}
        rotateControl={googleMapOptions.rotateControl}
        rotateControlOptions={{ position: getControlPosition(googleMapOptions.rotateControlPosition, 'RIGHT_BOTTOM') }}
        onCameraChanged={(event) => {
          const viewport = {
            latitude: event.detail.center.lat,
            longitude: event.detail.center.lng,
            zoom: event.detail.zoom,
            bearing: event.detail.heading,
            pitch: event.detail.tilt,
          };
          onViewportChange?.(viewport);
          writeHashView(viewport);
        }}
      >
        <GoogleDeckOverlay
          layers={layers}
          interleaved={interleaved}
        />
        <GoogleFitBounds disabled={Boolean(initialHashView)} initialHashView={initialHashView} fitBounds={fitBounds} />
        <GoogleHashRoute enabled={hashRoutingEnabled} />
        <GoogleGeolocateControl enabled={geolocateControl && interactive} />
      </Map>
    </APIProvider>
  );
}
