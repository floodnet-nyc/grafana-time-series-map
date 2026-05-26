import React, { useEffect, useMemo, useState } from 'react';
import Map, { type ControlPosition, type MapRef, type ViewStateChangeEvent } from 'react-map-gl/maplibre';
import { DeckGL, type DeckGLProps } from '@deck.gl/react';
import type { Map as MapLibreMap } from 'maplibre-gl';
import { MapboxOverlay, type MapboxOverlayProps } from '@deck.gl/mapbox';
import type { MapViewState, ViewStateChangeParameters, Widget, WidgetPlacement } from '@deck.gl/core';
import { resolveMapInstance, type FitBounds, type MapProviderProps, type WidgetViewStateChange } from '../types';
import { useDeckGLProps } from '../DeckGLMap';
import { MapFitBounds, type MapFitBoundsProps } from '../MapFitBounds';
import { useWidgetControls, WidgetControlAdapter } from '../widgetControlReconciler';
import { getMaplibreStyleUrl } from './style';
import { resolveMaplibreNativeControls } from '../../../widgets/_all';
import { useMapProviderState, type MapProviderAdapter } from '../useMapProviderState';
import 'maplibre-gl/dist/maplibre-gl.css';

function applyMaplibreViewState(map: MapLibreMap, next: WidgetViewStateChange) {
  const m = map;
  const camera: Parameters<MapLibreMap['easeTo']>[0] = {
    duration: typeof next.transitionDuration === 'number' ? next.transitionDuration : 300,
  };
  if (typeof next.longitude === 'number' && typeof next.latitude === 'number') {
    camera.center = [next.longitude, next.latitude];
  }
  if (typeof next.zoom === 'number') {
    camera.zoom = next.zoom;
  }
  if (typeof next.bearing === 'number') {
    camera.bearing = next.bearing;
  }
  if (typeof next.pitch === 'number') {
    camera.pitch = next.pitch;
  }
  m.easeTo(camera);
}

async function captureMaplibreScreenshot(map: MapLibreMap): Promise<string | undefined> {
  const m = map;
  return new Promise((resolve) => {
    m.once('render', () => {
      resolve(m.getCanvas().toDataURL());
    });
    m.triggerRepaint();
  });
}

// ── Widget control adapter ────────────────────────────────────────────────────

function maplibrePlacement(placement: WidgetPlacement): ControlPosition {
  return placement === 'fill' ? 'top-left' : (placement as ControlPosition);
}

class DeckWidgetControl {
  container: HTMLDivElement | null = null;
  private widget: Widget;

  constructor(widget: Widget) {
    this.widget = widget;
  }

  get widgetRef() {
    return this.widget;
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

function createDeckWidgetControl(widget: Widget) {
  const container = document.createElement('div');
  container.className = 'maplibregl-ctrl mapboxgl-ctrl deck-widget-ctrl';
  const control = new DeckWidgetControl(widget);
  control.container = container;
  widget.props._container = container;
  return control;
}

// ── Map provider component ────────────────────────────────────────────────────

export default function MaplibreMap(props: MapProviderProps) {
  const { width, height, options, layers } = props;
  const viewportAdapter: MapProviderAdapter<
    MapLibreMap,
    ViewStateChangeParameters<MapViewState>,
    ViewStateChangeEvent
  > = useMemo(
    () => ({
      applyViewState: applyMaplibreViewState,
      captureScreenshot: captureMaplibreScreenshot,
      getViewport: (event) => {
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
    handleMoveEnd,
    mapRef,
    mergedCallbacks,
  } = useMapProviderState(props, viewportAdapter);

  // Sync ref-based map instance into state for reactive hooks.
  // Re-syncs after each render — safe because setState with the
  // same value is a no-op.
  const [maplibreMap, setMaplibreMap] = useState<MapLibreMap | undefined>();
  const mapElementRef = React.useRef<MapRef | null>(null);
  useEffect(() => {
    const map = mapElementRef.current?.getMap();
    mapRef.current = mapElementRef.current;
    setMaplibreMap(map);
  }, [mapRef]);

  const styleUrl = useMemo(
    () => getMaplibreStyleUrl(options.basemap.maplibre.mapStyle, options.basemap.maplibre.mapStyleUrl),
    [options.basemap.maplibre.mapStyle, options.basemap.maplibre.mapStyleUrl]
  );

  const deckProps = useDeckGLProps({ options, layers, widgetCallbacks: mergedCallbacks });

  /* --------------------------------- Widgets -------------------------------- */

  const widgetAdapter: WidgetControlAdapter<Widget, DeckWidgetControl> = useMemo(
    () => ({
      createControl: (widget) => createDeckWidgetControl(widget),
      mountControl: (control) => {
        const m = resolveMapInstance(mapRef.current);
        m?.addControl(control as any, maplibrePlacement(control.widgetRef.placement));
      },
      unmountControl: (control) => {
        const m = resolveMapInstance(mapRef.current);
        m?.removeControl(control as any);
      },
      matches: (control, widget) => control.matches(widget),
      updateControl: (control, widget) => control.setWidget(widget),
    }),
    [mapRef]
  );

  useWidgetControls(maplibreMap, deckProps.widgets as Widget[] | undefined, widgetAdapter);
  const nativeMaplibreControls = useMemo(() => resolveMaplibreNativeControls(options.widgets ?? []), [options.widgets]);

  const fitBoundsProps = useMemo<Omit<MapFitBoundsProps<MapLibreMap>, 'onViewState' | 'map'>>(
    () => ({
      disabled: Boolean(props.initialViewFromHash),
      fitBounds: props.fitBounds,
      fitRequestId: props.fitRequestId,
      options,
      fitBoundsToMap: (map: MapLibreMap, bounds: FitBounds, fitOpts) =>
        map.fitBounds(bounds, { ...fitOpts, duration: 800 }),
      getContainerSize: (map: MapLibreMap) => {
        const c = map.getContainer();
        return { width: c.clientWidth, height: c.clientHeight };
      },
    }),
    [props.initialViewFromHash, props.fitBounds, props.fitRequestId, options]
  );

  const children = (
    <>
      <MapFitBounds {...fitBoundsProps} onViewState={controller ? handleFitViewState : undefined} map={maplibreMap} />
      {nativeMaplibreControls}
    </>
  );

  const mapProps = {
    style: { width, height } as React.CSSProperties,
    mapStyle: styleUrl,
    projection: (options.basemap.maplibre.projection ?? 'mercator') as 'mercator' | 'globe',
    interactive,
    cooperativeGestures: interactive ? (options.basemap.interactions?.cooperativeGestures ?? false) : false,
    rollEnabled: interactive ? (options.basemap.interactions?.rollEnabled ?? true) : false,
    attributionControl: { compact: true } as any,
  };

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
          <Map {...mapProps} ref={mapElementRef}>
            {children}
          </Map>
        </DeckGL>
      </div>
    );
  }

  return (
    <Map ref={mapElementRef} {...mapProps} initialViewState={props.initialViewState} onMoveEnd={handleMoveEnd}>
      <DeckOverlay deckProps={deckProps as DeckGLProps} maplibreMap={maplibreMap} />
      {children}
    </Map>
  );
}

function DeckOverlay({ deckProps, maplibreMap }: { deckProps: DeckGLProps; maplibreMap?: MapLibreMap }) {
  const overlay = useMemo(
    () => new MapboxOverlay({ ...deckProps } as MapboxOverlayProps),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  useEffect(() => {
    if (!maplibreMap || !overlay) {
      return;
    }
    maplibreMap.addControl(overlay as any);
    return () => {
      maplibreMap.removeControl(overlay as any);
    };
  }, [maplibreMap, overlay]);

  useEffect(() => {
    overlay?.setProps(deckProps);
  }, [overlay, deckProps]);
  return null;
}
