import React, { useEffect, useMemo, useState } from 'react';
import Map, { type ControlPosition } from 'react-map-gl/maplibre';
import { DeckGL, type DeckGLProps } from '@deck.gl/react';
import type { Map as MapLibreMap } from 'maplibre-gl';
import { MapboxOverlay, MapboxOverlayProps } from '@deck.gl/mapbox';
import type { Widget, WidgetPlacement } from '@deck.gl/core';
import type { MapProviderProps, WidgetViewStateChange } from '../types';
import { useDeckGLProps } from '../DeckGLMap';
import { MapFitBounds } from '../MapFitBounds';
import { useWidgetControls, WidgetControlAdapter } from '../widgetControlReconciler';
import { getMaplibreStyleUrl } from './style';
import { resolveMaplibreNativeControls } from '../../../widgets/_all';
import { useMapProviderState } from '../useMapProviderState';
import 'maplibre-gl/dist/maplibre-gl.css';

function applyMaplibreViewState(map: unknown, next: WidgetViewStateChange) {
  const m = map as MapLibreMap;
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

async function captureMaplibreScreenshot(map: unknown): Promise<string | undefined> {
  const m = map as MapLibreMap;
  return new Promise((resolve) => {
    m.once('render', () => {
      resolve(m.getCanvas().toDataURL());
    });
    m.triggerRepaint();
  });
}

// ── Widget control adapter ────────────────────────────────────────────────────

function maplibrePlacement(placement: WidgetPlacement): ControlPosition {
  return placement === 'fill' ? 'top-left' : placement as ControlPosition;
}

class DeckWidgetControl {
  container: HTMLDivElement | null = null;
  private widget: Widget;

  constructor(widget: Widget) { this.widget = widget; }

  get widgetRef() { return this.widget; }
  matches(w: Widget) { return this.widget.id === w.id && this.widget.placement === w.placement; }

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

  const {
    controller,
    interactive,
    viewState,
    handleViewStateChange,
    handleFitViewState,
    handleMoveEnd,
    mapRef,
    mergedCallbacks,
  } = useMapProviderState(props, {
    applyViewState: applyMaplibreViewState,
    captureScreenshot: captureMaplibreScreenshot,
  });

  // Sync ref-based map instance into state for reactive hooks.
  // Re-syncs after each render — safe because setState with the
  // same value is a no-op.
  const [maplibreMap, setMaplibreMap] = useState<MapLibreMap | undefined>();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    setMaplibreMap(mapRef.current?.getMap?.());
  });

  const styleUrl = useMemo(
    () => getMaplibreStyleUrl(options.basemap.maplibre.mapStyle, options.basemap.maplibre.mapStyleUrl),
    [options.basemap.maplibre.mapStyle, options.basemap.maplibre.mapStyleUrl],
  );

  const deckProps = useDeckGLProps({ options, layers, widgetCallbacks: mergedCallbacks });

  const widgetAdapter: WidgetControlAdapter<Widget, DeckWidgetControl> = useMemo(() => ({
    createControl: (widget) => createDeckWidgetControl(widget),
    mountControl: (control) => {
      const m = mapRef.current?.getMap?.();
      m?.addControl(control as any, maplibrePlacement(control.widgetRef.placement));
    },
    unmountControl: (control) => {
      const m = mapRef.current?.getMap?.();
      m?.removeControl(control as any);
    },
    matches: (control, widget) => control.matches(widget),
    updateControl: (control, widget) => control.setWidget(widget),
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), []);

  useWidgetControls(maplibreMap, deckProps.widgets as Widget[] | undefined, widgetAdapter);

  const nativeMaplibreControls = useMemo(
    () => resolveMaplibreNativeControls(options.widgets ?? []),
    [options.widgets],
  );

  const fitBoundsProps = useMemo(() => ({
    disabled: Boolean(props.initialViewFromHash),
    fitBounds: props.fitBounds,
    fitRequestId: props.fitRequestId,
    options,
    fitBoundsToMap: (map: unknown, bounds: any, fitOpts: any) =>
      (map as MapLibreMap).fitBounds(bounds, { ...fitOpts, duration: 800 }),
    getContainerSize: (map: unknown) => {
      const c = (map as MapLibreMap).getContainer();
      return { width: c.clientWidth, height: c.clientHeight };
    },
  }), [props.initialViewFromHash, props.fitBounds, props.fitRequestId, options]);

  const overlay = useMemo(
    () => controller ? null : new MapboxOverlay({ ...deckProps, widgets: deckProps.widgets } as MapboxOverlayProps),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [controller],
  );

  useEffect(() => {
    if (controller || !maplibreMap || !overlay) { return; }
    maplibreMap.addControl(overlay as any);
    return () => { maplibreMap.removeControl(overlay as any); };
  }, [controller, maplibreMap, overlay]);

  useEffect(() => { overlay?.setProps(deckProps); }, [overlay, deckProps]);

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
        <DeckGL {...deckProps as DeckGLProps} width={width} height={height} controller viewState={viewState} onViewStateChange={handleViewStateChange}>
          <Map {...mapProps} ref={mapRef}>
            {children}
          </Map>
        </DeckGL>
      </div>
    );
  }

  return (
    <Map ref={mapRef} {...mapProps} initialViewState={props.initialViewState} onMoveEnd={handleMoveEnd}>
      {children}
    </Map>
  );
}
