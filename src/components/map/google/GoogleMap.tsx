import React, { useEffect, useMemo } from 'react';
import { APIProvider, Map, limitTiltRange, useMap } from '@vis.gl/react-google-maps';
import { GoogleMapsOverlay } from '@deck.gl/google-maps';
import type { Widget, WidgetPlacement } from '@deck.gl/core';
import DeckGL, { DeckGLProps } from '@deck.gl/react';
import type { MapProviderProps, ViewportSnapshot, WidgetViewStateChange } from '../types';
import { useDeckGLProps } from '../DeckGLMap';
import { MapFitBounds } from '../MapFitBounds';
import { useWidgetControls, WidgetControlAdapter } from '../widgetControlReconciler';
import { getGoogleColorScheme, getControlPosition } from './controlMappings';
import { resolveMapControlSettings } from '../controlSettings';
import { resolveGoogleNativeProps } from '../../../widgets/_all';
import { useMapProviderState } from '../useMapProviderState';

function applyGoogleViewState(map: unknown, next: WidgetViewStateChange) {
  const m = map as google.maps.Map;
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

  constructor(widget: Widget) { this.widget = widget; }

  get widgetRef() { return this.widget; }

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
      if (index >= 0) { controls.removeAt(index); }
    }
    this.container?.remove();
    this.container = null;
    this.map = null;
    this.position = null;
  }

  matches(w: Widget) { return this.widget.id === w.id && this.widget.placement === w.placement; }

  setWidget(w: Widget) {
    this.widget = w;
    if (this.container) { w.props._container = this.container; }
  }
}

function getGoogleWidgetPlacement(placement: WidgetPlacement): google.maps.ControlPosition {
  switch (placement) {
    case 'top-right':    return google.maps.ControlPosition.TOP_RIGHT;
    case 'bottom-left':  return google.maps.ControlPosition.BOTTOM_LEFT;
    case 'bottom-right': return google.maps.ControlPosition.BOTTOM_RIGHT;
    case 'fill':
    case 'top-left':
    default:             return google.maps.ControlPosition.TOP_LEFT;
  }
}

const mapTypeControlStyleValues: Record<string, google.maps.MapTypeControlStyle> = {
  DEFAULT: 0 as google.maps.MapTypeControlStyle,
  DROPDOWN_MENU: 2 as google.maps.MapTypeControlStyle,
  HORIZONTAL_BAR: 1 as google.maps.MapTypeControlStyle,
};

type GoogleMapControlProps = Pick<
  google.maps.MapOptions,
  | 'zoomControl' | 'zoomControlOptions'
  | 'cameraControl' | 'cameraControlOptions'
  | 'fullscreenControl' | 'fullscreenControlOptions'
  | 'scaleControl' | 'rotateControl' | 'rotateControlOptions'
  | 'mapTypeControl' | 'mapTypeControlOptions'
>;

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

  const {
    controller,
    interactive,
    viewState,
    handleViewStateChange,
    handleFitViewState,
    mapRef,
    themeMode,
    mergedCallbacks,
  } = useMapProviderState(props, {
    applyViewState: applyGoogleViewState,
    limitViewState: limitTiltRange as (vs: ViewportSnapshot) => ViewportSnapshot,
  });

  // Sync Google map to the hook's ref so widget callbacks can access it.
  useEffect(() => {
    mapRef.current = googleMap;
  });


  const deckProps = useDeckGLProps({ options, layers, widgetCallbacks: mergedCallbacks });

  const widgetAdapter: WidgetControlAdapter<Widget, GoogleWidgetControl> = useMemo(() => ({
    createControl: (widget) => new GoogleWidgetControl(widget),
    mountControl: (control) => googleMap && control.addToMap(googleMap),
    unmountControl: (control) => control.remove(),
    matches: (control, widget) => control.matches(widget),
    updateControl: (control, widget) => control.setWidget(widget),
  }), [googleMap]);

  useWidgetControls(googleMap, deckProps.widgets as Widget[] | undefined, widgetAdapter);

  const googleNativeProps = useMemo(
    () => resolveGoogleNativeProps(options.widgets ?? []),
    [options.widgets],
  );

  const controlSettings = resolveMapControlSettings(options);
  const googleControlProps = useMemo<GoogleMapControlProps>(() => ({
    ...googleNativeProps,
    mapTypeControl: controlSettings.google.mapTypeControl ?? false,
    mapTypeControlOptions: {
      position: getControlPosition(controlSettings.google.mapTypeControlPosition, 'TOP_LEFT'),
      style: mapTypeControlStyleValues[controlSettings.google.mapTypeControlStyle],
    },
  }), [googleNativeProps, controlSettings]);

  const sharedMapProps = {
    mapId: options.basemap.google.mapId || undefined,
    colorScheme: getGoogleColorScheme(themeMode),
    defaultCenter: { lat: props.initialViewState?.latitude ?? 0, lng: props.initialViewState?.longitude ?? 0 },
    defaultZoom: props.initialViewState?.zoom ?? 2,
    defaultHeading: props.initialViewState?.bearing ?? 0,
    defaultTilt: props.initialViewState?.pitch ?? 0,
  };

  const fitBoundsProps = {
    disabled: Boolean(props.initialViewFromHash),
    fitBounds: props.fitBounds,
    fitRequestId: props.fitRequestId,
    options,
    fitBoundsToMap: (map: unknown, bounds: any, fitOpts: any) => {
      const m = map as google.maps.Map;
      const lb = new google.maps.LatLngBounds(
        { lat: bounds[0][1], lng: bounds[0][0] },
        { lat: bounds[1][1], lng: bounds[1][0] },
      );
      m.fitBounds(lb, fitOpts.padding);
      const zoom = m.getZoom();
      if (typeof fitOpts.maxZoom === 'number' && typeof zoom === 'number' && zoom > fitOpts.maxZoom) {
        m.setZoom(fitOpts.maxZoom);
      }
    },
    getContainerSize: (map: unknown) => {
      const div = (map as google.maps.Map).getDiv();
      return { width: div.clientWidth, height: div.clientHeight };
    },
  };

  const overlay = useMemo(() => {
    if (controller) { return null; }
    const resizeState: { dpr?: number } = {};
    const instance = new GoogleMapsOverlay({
      interleaved: deckProps.interleaved ?? true,
      ...deckProps,
      widgets: deckProps.widgets,
      onResize: (size: { width: number; height: number }) => {
        const deck = (instance as any)._deck;
        if (!deck) { return; }
        const ctx = deck.animationLoop.animationProps.canvasContext;
        const dpr = resizeState.dpr ?? ctx.devicePixelRatio;
        resizeState.dpr = dpr;
        ctx.setDrawingBufferSize(size.width * dpr, size.height * dpr);
      },
    });
    return instance;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [controller]);

  useEffect(() => {
    if (controller || !googleMap) { return; }
    overlay?.setMap(googleMap);
    return () => overlay?.setMap(null);
  }, [controller, googleMap, overlay]);

  useEffect(() => { overlay?.setProps(deckProps); }, [overlay, deckProps]);

  const children = (
    <MapFitBounds {...fitBoundsProps} onViewState={controller ? handleFitViewState : undefined} map={googleMap} />
  );

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
      gestureHandling={!interactive ? 'none' : (options.basemap.interactions?.cooperativeGestures ? 'cooperative' : 'auto')}
      keyboardShortcuts={interactive}
      clickableIcons={interactive}
      controlSize={25}
      {...googleControlProps}
      tiltInteractionEnabled={options.basemap.interactions?.rollEnabled}
      onCameraChanged={(event: any) => {
        props.onViewportChange?.({
          latitude: event.detail.center.lat,
          longitude: event.detail.center.lng,
          zoom: event.detail.zoom,
          bearing: event.detail.heading,
          pitch: event.detail.tilt,
        });
      }}
    >
      {children}
    </Map>
  );
}
