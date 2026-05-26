import React, { useEffect, useMemo } from 'react';
import { APIProvider, Map, limitTiltRange, useMap } from '@vis.gl/react-google-maps';
import { GoogleMapsOverlay } from '@deck.gl/google-maps';
import type { MapViewState, ViewStateChangeParameters, Widget, WidgetPlacement } from '@deck.gl/core';
import DeckGL, { type DeckGLProps } from '@deck.gl/react';
import type { FitBounds, MapProviderProps, WidgetViewStateChange } from '../types';
import { MapFitBounds, type MapFitBoundsProps } from '../MapFitBounds';
import { useDeckGLProps } from '../DeckGLMap';
import { useWidgetControls, WidgetControlAdapter } from '../widgetControlReconciler';
import { getGoogleColorScheme } from './controlMappings';
import { resolveGoogleNativeProps } from '../../../widgets/_all';
import { useMapProviderState, type MapProviderAdapter } from '../useMapProviderState';

interface GoogleCameraChangedEvent {
  detail: {
    center: google.maps.LatLngLiteral;
    zoom: number;
    heading: number;
    tilt: number;
  };
}

function applyGoogleViewState(map: google.maps.Map, next: WidgetViewStateChange) {
  const m = map;
  const cameraOptions: google.maps.CameraOptions = {};
  const currentCenter = m.getCenter();
  const currentZoom = m.getZoom();
  const currentHeading = m.getHeading();
  const currentTilt = m.getTilt();

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

  m.moveCamera(cameraOptions);
}

// ── Widget control adapter ────────────────────────────────────────────────────

class GoogleWidgetControl {
  private widget: Widget;
  private container: HTMLDivElement | null = null;
  private map: google.maps.Map | null = null;
  private position: google.maps.ControlPosition | null = null;

  constructor(widget: Widget) {
    this.widget = widget;
  }

  get widgetRef() {
    return this.widget;
  }

  addToMap(map: google.maps.Map) {
    const container = document.createElement('div');
    container.className = 'deck-widget-ctrl';
    container.style.pointerEvents = 'auto';
    const placement = getGoogleWidgetPlacement(this.widget.placement);
    map.controls[placement].push(container);
    this.container = container;
    this.map = map;
    this.position = placement;
    this.widget.props._container = container;
  }

  remove() {
    if (this.container && this.widget.props._container === this.container) {
      this.widget.props._container = null;
    }
    if (this.map && this.position !== null && this.container) {
      const controls = this.map.controls[this.position];
      const index = controls.getArray().indexOf(this.container);
      if (index >= 0) {
        controls.removeAt(index);
      }
    }
    this.container?.remove();
    this.container = null;
    this.map = null;
    this.position = null;
  }

  matches(w: Widget) {
    return this.widget.id === w.id && this.widget.placement === w.placement;
  }

  setWidget(w: Widget) {
    this.widget = w;
    if (this.container) {
      w.props._container = this.container;
    }
  }
}

function getGoogleWidgetPlacement(placement: WidgetPlacement): google.maps.ControlPosition {
  switch (placement) {
    case 'top-right':
      return google.maps.ControlPosition.TOP_RIGHT;
    case 'bottom-left':
      return google.maps.ControlPosition.BOTTOM_LEFT;
    case 'bottom-right':
      return google.maps.ControlPosition.BOTTOM_RIGHT;
    case 'fill':
    case 'top-left':
    default:
      return google.maps.ControlPosition.TOP_LEFT;
  }
}

// ── Map provider component ────────────────────────────────────────────────────

export default function GoogleMap(props: MapProviderProps) {
  return (
    <APIProvider apiKey={props.options.basemap.google.apiKey ?? ''}>
      <GoogleMapInner {...props} />
    </APIProvider>
  );
}

function GoogleMapInner(props: MapProviderProps) {
  const { width, height, options, layers } = props;
  const googleMap = useMap();
  const viewportAdapter: MapProviderAdapter<
    google.maps.Map,
    ViewStateChangeParameters<MapViewState>,
    GoogleCameraChangedEvent
  > = useMemo(
    () => ({
      applyViewState: applyGoogleViewState,
      limitViewState: limitTiltRange,
      getViewport: (event) => {
        if ('detail' in event) {
          return {
            latitude: event.detail.center.lat,
            longitude: event.detail.center.lng,
            zoom: event.detail.zoom,
            bearing: event.detail.heading,
            pitch: event.detail.tilt,
          };
        }
        const viewState = 'viewState' in event ? event.viewState : event;
        return {
          latitude: viewState.latitude,
          longitude: viewState.longitude,
          zoom: viewState.zoom,
          bearing: viewState.bearing ?? 0,
          pitch: viewState.pitch ?? 0,
        };
      },
    }),
    []
  );

  const {
    controller,
    interactive,
    viewState,
    handleViewStateChange,
    handleFitViewState,
    mapRef,
    themeMode,
    mergedCallbacks,
  } = useMapProviderState(props, viewportAdapter);

  // Sync Google map to the hook's ref so widget callbacks can access it.
  useEffect(() => {
    mapRef.current = googleMap;
  });

  const deckProps = useDeckGLProps({ options, layers, widgetCallbacks: mergedCallbacks });

  /* --------------------------------- Widgets -------------------------------- */

  const widgetAdapter: WidgetControlAdapter<Widget, GoogleWidgetControl> = useMemo(
    () => ({
      createControl: (widget) => new GoogleWidgetControl(widget),
      mountControl: (control) => googleMap && control.addToMap(googleMap),
      unmountControl: (control) => control.remove(),
      matches: (control, widget) => control.matches(widget),
      updateControl: (control, widget) => control.setWidget(widget),
    }),
    [googleMap]
  );

  useWidgetControls(googleMap, deckProps.widgets as Widget[] | undefined, widgetAdapter);
  const googleControlProps = useMemo(() => resolveGoogleNativeProps(options.widgets ?? []), [options.widgets]);

  /* ----------------------------------- Map ---------------------------------- */

  const sharedMapProps = {
    mapId: options.basemap.google.mapId || undefined,
    colorScheme: getGoogleColorScheme(themeMode),
    defaultCenter: { lat: props.initialViewState?.latitude ?? 0, lng: props.initialViewState?.longitude ?? 0 },
    defaultZoom: props.initialViewState?.zoom ?? 2,
    defaultHeading: props.initialViewState?.bearing ?? 0,
    defaultTilt: props.initialViewState?.pitch ?? 0,
  };

  const fitBoundsProps: Omit<MapFitBoundsProps<google.maps.Map>, 'onViewState' | 'map'> = {
    disabled: Boolean(props.initialViewFromHash),
    fitBounds: props.fitBounds,
    fitRequestId: props.fitRequestId,
    options,
    fitBoundsToMap: (map: google.maps.Map, bounds: FitBounds, fitOpts) => {
      const m = map;
      const lb = new google.maps.LatLngBounds(
        { lat: bounds[0][1], lng: bounds[0][0] },
        { lat: bounds[1][1], lng: bounds[1][0] }
      );
      m.fitBounds(lb, fitOpts.padding);
      const zoom = m.getZoom();
      if (typeof fitOpts.maxZoom === 'number' && typeof zoom === 'number' && zoom > fitOpts.maxZoom) {
        m.setZoom(fitOpts.maxZoom);
      }
    },
    getContainerSize: (map: google.maps.Map) => {
      const div = map.getDiv();
      return { width: div.clientWidth, height: div.clientHeight };
    },
  };

  const children = (
    <MapFitBounds {...fitBoundsProps} onViewState={controller ? handleFitViewState : undefined} map={googleMap} />
  );

  if (controller) {
    return (
      <div style={{ width, height }}>
        <DeckGL
          {...(deckProps as DeckGLProps)}
          width={width}
          height={height}
          controller
          viewState={viewState}
          onViewStateChange={handleViewStateChange}
        >
          <Map
            {...sharedMapProps}
            style={{ width, height }}
            gestureHandling="none"
            keyboardShortcuts={false}
            clickableIcons={false}
            zoomControl={false}
            cameraControl={false}
            fullscreenControl={false}
            scaleControl={false}
            mapTypeControl={false}
            rotateControl={false}
            streetViewControl={false}
          >
            {children}
          </Map>
        </DeckGL>
      </div>
    );
  }

  return (
    <Map
      {...sharedMapProps}
      style={{ width, height }}
      gestureHandling={
        !interactive ? 'none' : options.basemap.interactions?.cooperativeGestures ? 'cooperative' : 'auto'
      }
      keyboardShortcuts={interactive}
      clickableIcons={interactive}
      controlSize={25}
      {...googleControlProps}
      tiltInteractionEnabled={options.basemap.interactions?.rollEnabled}
      onCameraChanged={(event: GoogleCameraChangedEvent) =>
        props.onViewportChange?.(viewportAdapter.getViewport(event))
      }
    >
      <DeckOverlay deckProps={deckProps as DeckGLProps} googleMap={googleMap ?? undefined} />
      {children}
    </Map>
  );
}

function DeckOverlay({ deckProps, googleMap }: { deckProps: DeckGLProps; googleMap?: google.maps.Map }) {
  const overlay = useMemo(
    () => new GoogleMapsOverlay({ ...deckProps } as any),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  useEffect(() => {
    if (!googleMap || !overlay) {
      return;
    }
    overlay.setMap(googleMap);
    return () => overlay.setMap(null);
  }, [googleMap, overlay]);

  useEffect(() => {
    overlay?.setProps(deckProps);
  }, [overlay, deckProps]);
  return null;
}
