import React, { useEffect, useMemo } from 'react';
import { APIProvider, ColorScheme, ControlPosition, Map, useMap } from '@vis.gl/react-google-maps';
import { GoogleMapsOverlay, type GoogleMapsOverlayProps } from '@deck.gl/google-maps';
import type { Layer } from '@deck.gl/core';
import type { GoogleControlPosition, GoogleMapColorScheme, GoogleMapTypeControlStyle, MapPanelOptions } from '../../types';
import type { ViewportSnapshot } from './MaplibreMap';
import { useMapHashRoute } from '../../hooks/useMapHashRoute';
import { buildDeckEffects } from '../../utils/deckgl/lighting';
import { buildDeckParameters } from '../../utils/deckgl/parameters';

function OverlayController(props: GoogleMapsOverlayProps) {
  const map = useMap();

  const overlay = useMemo(() => {
    const resizeState: { dpr?: number } = {};
    const overlay = new GoogleMapsOverlay({
      interleaved: props.interleaved ?? true, ...props,
      onResize: (size: {width: number, height: number}) => {
        const deck = (overlay as any)._deck;
        if (!deck) {return;}
        const ctx = deck.animationLoop.animationProps.canvasContext
        const dpr = resizeState.dpr ?? ctx.devicePixelRatio;
        resizeState.dpr = dpr;
        ctx.setDrawingBufferSize(size.width * dpr, size.height * dpr);
      }
    });
    return overlay;
    // Intentionally run once
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!map) {return;}
    overlay.setMap(map);
    return () => { overlay.setMap(null); };
  }, [map, overlay]);

  // Synchronous during render (not useEffect) so deck.gl receives updated layers
  // before the browser paints, matching them to the same RAF cycle.
  overlay.setProps(props);

  return null;
}

function GoogleHashRoute({ enabled }: { enabled: boolean }) {
  const map = useMap();
  useMapHashRoute(enabled, (view) => {
    if (map) {
      map.moveCamera({
        center: { lat: view.latitude, lng: view.longitude },
        zoom: view.zoom,
        heading: view.bearing,
        tilt: view.pitch,
      });
    }
  });

  return null;
}

function GoogleGeolocateControl({ enabled }: { enabled: boolean }) {
  const map = useMap();

  useEffect(() => {
    if (!enabled || !map || typeof navigator === 'undefined') {
      return;
    }
    const button = document.createElement('button');
    button.type = 'button';
    button.title = 'Find my location';
    button.setAttribute('aria-label', 'Find my location');
    button.textContent = '◎';
    Object.assign(button.style, {
      background: '#fff',
      border: '0',
      borderRadius: '2px',
      boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
      color: '#333',
      cursor: 'pointer',
      fontSize: '20px',
      height: '40px',
      lineHeight: '40px',
      margin: '10px',
      padding: '0',
      textAlign: 'center',
      width: '40px',
    });
    const infoWindow = new google.maps.InfoWindow();
    const handleClick = () => {
      if (!navigator.geolocation) {
        infoWindow.setPosition(map.getCenter());
        infoWindow.setContent("Error: Your browser doesn't support geolocation.");
        infoWindow.open(map);
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const center = { lat: position.coords.latitude, lng: position.coords.longitude };
          infoWindow.setPosition(center);
          infoWindow.setContent('Location found.');
          infoWindow.open(map);
          map.setCenter(center);
          map.setZoom(Math.max(map.getZoom() ?? 0, 14));
        },
        () => {
          infoWindow.setPosition(map.getCenter());
          infoWindow.setContent('Error: The Geolocation service failed.');
          infoWindow.open(map);
        },
        { enableHighAccuracy: true },
      );
    };
    button.addEventListener('click', handleClick);
    const controls = map.controls[ControlPosition.TOP_RIGHT];
    controls.push(button);
    return () => {
      button.removeEventListener('click', handleClick);
      const index = controls.getArray().indexOf(button);
      if (index >= 0) {
        controls.removeAt(index);
      }
      infoWindow.close();
    };
  }, [enabled, map]);

  return null;
}

interface GoogleMapProps {
  width: number;
  height: number;
  options: MapPanelOptions;
  layers: Layer[];
  interleaved?: boolean;
  onViewportChange?: (viewport: ViewportSnapshot) => void;
}

const googleControlPositionValues: Record<GoogleControlPosition, google.maps.ControlPosition> = {
  BLOCK_START_INLINE_START: ControlPosition.BLOCK_START_INLINE_START,
  BLOCK_START_INLINE_CENTER: ControlPosition.BLOCK_START_INLINE_CENTER,
  BLOCK_START_INLINE_END: ControlPosition.BLOCK_START_INLINE_END,
  INLINE_START_BLOCK_START: ControlPosition.INLINE_START_BLOCK_START,
  INLINE_START_BLOCK_CENTER: ControlPosition.INLINE_START_BLOCK_CENTER,
  INLINE_START_BLOCK_END: ControlPosition.INLINE_START_BLOCK_END,
  INLINE_END_BLOCK_START: ControlPosition.INLINE_END_BLOCK_START,
  INLINE_END_BLOCK_CENTER: ControlPosition.INLINE_END_BLOCK_CENTER,
  INLINE_END_BLOCK_END: ControlPosition.INLINE_END_BLOCK_END,
  BLOCK_END_INLINE_START: ControlPosition.BLOCK_END_INLINE_START,
  BLOCK_END_INLINE_CENTER: ControlPosition.BLOCK_END_INLINE_CENTER,
  BLOCK_END_INLINE_END: ControlPosition.BLOCK_END_INLINE_END,
  TOP_LEFT: ControlPosition.TOP_LEFT,
  TOP_CENTER: ControlPosition.TOP_CENTER,
  TOP_RIGHT: ControlPosition.TOP_RIGHT,
  LEFT_TOP: ControlPosition.LEFT_TOP,
  LEFT_CENTER: ControlPosition.LEFT_CENTER,
  LEFT_BOTTOM: ControlPosition.LEFT_BOTTOM,
  RIGHT_TOP: ControlPosition.RIGHT_TOP,
  RIGHT_CENTER: ControlPosition.RIGHT_CENTER,
  RIGHT_BOTTOM: ControlPosition.RIGHT_BOTTOM,
  BOTTOM_LEFT: ControlPosition.BOTTOM_LEFT,
  BOTTOM_CENTER: ControlPosition.BOTTOM_CENTER,
  BOTTOM_RIGHT: ControlPosition.BOTTOM_RIGHT,
};

const googleColorSchemeValues: Record<GoogleMapColorScheme, typeof ColorScheme[keyof typeof ColorScheme]> = {
  LIGHT: ColorScheme.LIGHT,
  DARK: ColorScheme.DARK,
  FOLLOW_SYSTEM: ColorScheme.FOLLOW_SYSTEM,
};

const mapTypeControlStyleValues: Record<GoogleMapTypeControlStyle, google.maps.MapTypeControlStyle> = {
  DEFAULT: 0 as google.maps.MapTypeControlStyle,
  DROPDOWN_MENU: 2 as google.maps.MapTypeControlStyle,
  HORIZONTAL_BAR: 1 as google.maps.MapTypeControlStyle,
};

function getControlPosition(position: GoogleControlPosition | undefined, fallback: GoogleControlPosition) {
  return googleControlPositionValues[position ?? fallback];
}

export function GoogleMap({ width, height, options, layers, interleaved = true, onViewportChange }: GoogleMapProps) {
  const interactions = options.interactions ?? {};
  const googleMapOptions = options.googleMapOptions ?? {};
  const interactive = interactions.interactive ?? true;
  const { initialView: hashView, writeHashView } = useMapHashRoute(interactions.syncViewToUrl ?? false);
  const cameraControl = options.controls?.navigationControl;
  const geolocateControl = options.controls?.geolocateControl ?? false;
  const fullscreenControl = options.controls?.fullscreenControl;
  const scaleControl = options.controls?.scaleControl;
  const colorScheme = googleColorSchemeValues[googleMapOptions.colorScheme ?? 'LIGHT'];

  return (
    <APIProvider apiKey={options.googleMapsApiKey ?? ''}>
      <Map
        defaultCenter={{
          lat: hashView?.latitude ?? options.initialLatitude,
          lng: hashView?.longitude ?? options.initialLongitude,
        }}
        defaultZoom={hashView?.zoom ?? options.initialZoom}
        defaultHeading={hashView?.bearing ?? options.initialBearing ?? 0}
        defaultTilt={hashView?.pitch ?? options.initialPitch ?? 0}
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
        <OverlayController
          layers={layers}
          interleaved={interleaved}
          effects={buildDeckEffects(options.deckLighting)}
          parameters={buildDeckParameters(options.deckParameters)}
        />
        <GoogleHashRoute enabled={interactions.syncViewToUrl ?? false} />
        <GoogleGeolocateControl enabled={geolocateControl && interactive} />
      </Map>
    </APIProvider>
  );
}
