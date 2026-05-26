import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ScreenshotWidget } from '@deck.gl/widgets';
import {
  resolveMapInstance,
  type ControlledViewportChangeEvent,
  type MapProviderProps,
  type MapRefLike,
  type ViewportSnapshot,
  type WidgetCallbacks,
  type WidgetViewStateChange,
} from './types';
import type { ResetViewState } from '../../widgets/types';
import type { MapThemeMode } from '../../types';

export interface MapProviderAdapter<
  TMap,
  TControlledEvent = ControlledViewportChangeEvent,
  TMoveEndEvent = ControlledViewportChangeEvent,
> {
  applyViewState: (map: TMap, change: WidgetViewStateChange) => void;
  captureScreenshot?: (map: TMap) => Promise<string | undefined>;
  limitViewState?: (event: TControlledEvent) => TControlledEvent;
  getViewport: (event: TControlledEvent | TMoveEndEvent | ViewportSnapshot) => ViewportSnapshot;
}

export function useMapProviderState<
  TMap,
  TControlledEvent = ControlledViewportChangeEvent,
  TMoveEndEvent = TControlledEvent,
>(props: MapProviderProps, adapter: MapProviderAdapter<TMap, TControlledEvent, TMoveEndEvent>) {
  const { options, widgetCallbacks, initialViewState, onViewportChange } = props;
  const interactions = options.basemap.interactions ?? {};
  const interactive = interactions.interactive ?? true;
  const controller = options.deck.interleaved !== true;

  const [viewState, setViewState] = useState<ViewportSnapshot>(
    initialViewState ?? { latitude: 0, longitude: 0, zoom: 2, bearing: 0, pitch: 0 }
  );

  const handleViewStateChange = useCallback(
    (e: TControlledEvent) => {
      const event = adapter.limitViewState ? adapter.limitViewState(e) : e;
      const vs = adapter.getViewport(event);
      setViewState(vs);
      onViewportChange?.(vs);
    },
    [onViewportChange, adapter]
  );

  const handleFitViewState = useCallback((next: WidgetViewStateChange) => {
    setViewState((prev) => ({ ...prev, ...next }));
  }, []);

  const mapRef = useRef<MapRefLike<TMap> | null>(null);

  const handleWidgetViewStateChange = useCallback(
    (next: WidgetViewStateChange) => {
      if (controller) {
        setViewState((prev) => applyWidgetViewStateChange(prev, next));
        return;
      }
      const map = resolveMapInstance(mapRef.current);
      if (!map) {
        return;
      }
      adapter.applyViewState(map, next);
    },
    [controller, adapter]
  );

  const handleMoveEnd = useCallback(
    (e: TMoveEndEvent) => {
      onViewportChange?.(adapter.getViewport(e));
    },
    [adapter, onViewportChange]
  );

  const handleScreenshotCapture = useCallback(
    async (widget: ScreenshotWidget) => {
      if (!adapter.captureScreenshot) {
        return;
      }
      const map = resolveMapInstance(mapRef.current);
      if (!map) {
        return;
      }
      const dataUrl = await adapter.captureScreenshot(map);
      if (dataUrl) {
        widget.downloadDataURL(dataUrl, widget.props.filename);
      }
    },
    [adapter]
  );

  const { themeMode, setThemeMode } = useProviderThemeMode(options.theme?.mode);

  useInitialViewportReport(initialViewState, viewState, onViewportChange);

  const mergedCallbacks = useProviderWidgetCallbacks({
    widgetCallbacks,
    onViewStateChange: handleWidgetViewStateChange,
    resetViewState: initialViewState,
    screenshot: adapter.captureScreenshot ? { onCapture: handleScreenshotCapture } : undefined,
    themeMode,
    onThemeModeChange: setThemeMode,
  });

  return {
    controller,
    interactive,
    viewState,
    handleViewStateChange,
    handleFitViewState,
    handleWidgetViewStateChange,
    handleMoveEnd,
    mapRef,
    themeMode,
    setThemeMode,
    mergedCallbacks,
  };
}

export function applyWidgetViewStateChange(current: ViewportSnapshot, next: WidgetViewStateChange): ViewportSnapshot {
  return {
    latitude: typeof next.latitude === 'number' ? next.latitude : current.latitude,
    longitude: typeof next.longitude === 'number' ? next.longitude : current.longitude,
    zoom:
      typeof next.delta === 'number'
        ? current.zoom + next.delta
        : typeof next.zoom === 'number'
          ? next.zoom
          : current.zoom,
    bearing: typeof next.bearing === 'number' ? next.bearing : current.bearing,
    pitch: typeof next.pitch === 'number' ? next.pitch : current.pitch,
  };
}

export function useProviderThemeMode(mode: MapThemeMode | undefined) {
  const resolvedThemeMode = useMemo(() => resolveInitialThemeMode(mode), [mode]);
  const [autoThemeMode, setAutoThemeMode] = useState<'light' | 'dark'>(resolvedThemeMode);
  const themeMode = mode === 'light' || mode === 'dark' ? mode : autoThemeMode;
  const setThemeMode = useCallback(
    (nextMode: 'light' | 'dark') => {
      if (mode === 'light' || mode === 'dark') {
        return;
      }
      setAutoThemeMode(nextMode);
    },
    [mode]
  );

  return { themeMode, setThemeMode };
}

export function useInitialViewportReport(
  initialViewState: ViewportSnapshot | undefined,
  fallbackViewState: ViewportSnapshot,
  onViewportChange?: (viewport: ViewportSnapshot) => void
) {
  useEffect(() => {
    onViewportChange?.(initialViewState ?? fallbackViewState);
    // Report initial viewport once on mount only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

export function useProviderWidgetCallbacks({
  widgetCallbacks,
  onViewStateChange,
  resetViewState,
  themeMode,
  onThemeModeChange,
  screenshot,
}: {
  widgetCallbacks?: WidgetCallbacks;
  onViewStateChange: (next: WidgetViewStateChange) => void;
  resetViewState?: ResetViewState;
  themeMode: 'light' | 'dark';
  onThemeModeChange: (mode: 'light' | 'dark') => void;
  screenshot?: WidgetCallbacks['screenshot'];
}) {
  return useMemo(
    () => ({
      ...widgetCallbacks,
      onViewStateChange,
      resetViewState,
      ...(screenshot ? { screenshot } : {}),
      themeMode,
      onThemeModeChange,
    }),
    [widgetCallbacks, onViewStateChange, resetViewState, screenshot, themeMode, onThemeModeChange]
  );
}

export function resolveInitialThemeMode(mode: MapThemeMode | undefined): 'light' | 'dark' {
  if (mode === 'light' || mode === 'dark') {
    return mode;
  }

  if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  return 'light';
}
