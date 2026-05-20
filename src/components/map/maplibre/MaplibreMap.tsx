import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Map, {
  type MapRef,
} from 'react-map-gl/maplibre';
import { DeckGL, type DeckGLProps } from '@deck.gl/react';
import type { Map as MapLibreMap } from 'maplibre-gl';
import type { MapProviderProps, WidgetViewStateChange } from '../types';
import { useDeckGLProps } from '../DeckGLMap';
import { MaplibreDeckOverlay } from './MaplibreDeckOverlay';
import { MaplibreFitBounds } from './MaplibreFitBounds';
import { getMaplibreStyleUrl } from './style';
import { resolveMaplibreNativeControls } from '../../../widgets/_all';
import { resolveInitialThemeMode } from '../theme';
import 'maplibre-gl/dist/maplibre-gl.css';

function applyMaplibreViewState(map: MapLibreMap, next: WidgetViewStateChange) {
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

  map.easeTo(camera);
}

export default function MaplibreMap({
  width, height, options,
  layers, widgetCallbacks,
  initialViewState, initialViewFromHash,
  fitBounds, fitRequestId,
  onViewportChange,
}: MapProviderProps) {
  const styleUrl = getMaplibreStyleUrl(options.basemap.maplibre.mapStyle, options.basemap.maplibre.mapStyleUrl);

  const interactions = options.basemap.interactions ?? {};
  const interactive = interactions.interactive ?? true;
  const initialThemeMode = useMemo(() => resolveInitialThemeMode(options.theme?.mode), [options.theme?.mode]);

  // Whether DeckGL owns the viewport (controller mode) or MapLibre does (overlay/interleaved mode).
  const controller = options.deck.interleaved !== true;

  // ── Controlled viewState for DeckGL controller mode ─────────────────────────
  const [viewState, setViewState] = useState(initialViewState ?? { latitude: 0, longitude: 0, zoom: 2, bearing: 0, pitch: 0 });

  const handleViewStateChange = useCallback(({ viewState: next }: any) => {
    setViewState(next);
    onViewportChange?.(next);
  }, [onViewportChange]);

  const handleFitViewState = useCallback((next: object) => {
    setViewState((prev: any) => ({ ...prev, ...next }));
  }, []);

  // Viewport callback for widgets — merges with panel-level widgetCallbacks.
  const mapRef = useRef<MapRef>(null);

  const handleWidgetViewStateChange = useCallback((next: WidgetViewStateChange) => {
    if (controller) {
      setViewState((prev) => ({ ...prev, ...next }));
      return;
    }

    const map = mapRef.current?.getMap();
    if (!map) {
      return;
    }

    applyMaplibreViewState(map, next);
  }, [controller]);

  // ThemeWidget local state — provider owns this since it's a map UI concern.
  const [themeMode, setThemeMode] = useState<'light' | 'dark'>(initialThemeMode);

  useEffect(() => {
    setThemeMode(initialThemeMode);
  }, [initialThemeMode]);

  const mergedCallbacks = useMemo(() => ({
    ...widgetCallbacks,
    onViewStateChange: handleWidgetViewStateChange,
    resetViewState: initialViewState,
    themeMode,
    onThemeModeChange: setThemeMode,
  }), [widgetCallbacks, handleWidgetViewStateChange, initialViewState, themeMode]);

  const deckProps = useDeckGLProps({ options, layers, widgetCallbacks: mergedCallbacks });

  const handleMoveEnd = useCallback((e: any) => {
    onViewportChange?.(e.viewState);
  }, [onViewportChange]);

  useEffect(() => {
    onViewportChange?.(initialViewState ?? viewState);
    // Report initial viewport once on mount only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const mapProps = {
    style: { width, height },
    mapStyle: styleUrl,
    projection: options.basemap.maplibre.projection ?? 'mercator',
    interactive,
    cooperativeGestures: interactive ? interactions.cooperativeGestures ?? false : false,
    rollEnabled: interactive ? interactions.rollEnabled ?? true : false,
    attributionControl: { compact: true } as any,
  };

  const nativeMaplibreControls = useMemo(
    () => resolveMaplibreNativeControls(options.widgets ?? []),
    [options.widgets]
  );

  if (controller) {
    return (
      <div style={{ width, height }}>
      <DeckGL {...deckProps as DeckGLProps} width={width} height={height} controller viewState={viewState} onViewStateChange={handleViewStateChange}>
        <Map {...mapProps}>
          <MaplibreFitBounds
            disabled={Boolean(initialViewFromHash)}
            fitBounds={fitBounds}
            fitRequestId={fitRequestId}
            options={options}
            onViewState={handleFitViewState}
          />
          {nativeMaplibreControls}
        </Map>
      </DeckGL>
      </div>
    );
  }

  return (
    <Map ref={mapRef} {...mapProps} initialViewState={initialViewState} onMoveEnd={handleMoveEnd}>
      <MaplibreDeckOverlay {...deckProps} options={options} />
      <MaplibreFitBounds
        disabled={Boolean(initialViewFromHash)}
        fitBounds={fitBounds}
        fitRequestId={fitRequestId}
        options={options}
      />
      {nativeMaplibreControls}
    </Map>
  );
}
