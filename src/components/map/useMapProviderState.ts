import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { MapProviderProps, ViewportSnapshot, WidgetCallbacks, WidgetViewStateChange } from './types';
import type { MapThemeMode } from 'types';

interface MapProviderAdapter {
  applyViewState: (map: unknown, change: WidgetViewStateChange) => void;
  captureScreenshot?: (map: unknown) => Promise<string | undefined>;
  limitViewState?: (vs: ViewportSnapshot) => ViewportSnapshot;
}

export function useMapProviderState(
  props: MapProviderProps,
  adapter: MapProviderAdapter,
) {
  const { options, widgetCallbacks, initialViewState, onViewportChange } = props;
  const interactions = options.basemap.interactions ?? {};
  const interactive = interactions.interactive ?? true;
  const controller = options.deck.interleaved !== true;

  const [viewState, setViewState] = useState<ViewportSnapshot>(
    initialViewState ?? { latitude: 0, longitude: 0, zoom: 2, bearing: 0, pitch: 0 },
  );

  const handleViewStateChange = useCallback(
    (e: any) => {
      let vs: ViewportSnapshot = e.viewState ?? e;
      if (adapter.limitViewState) {
        vs = adapter.limitViewState(vs);
      }
      setViewState(vs);
      onViewportChange?.(vs);
    },
    [onViewportChange, adapter],
  );

  const handleFitViewState = useCallback((next: object) => {
    setViewState((prev: any) => ({ ...prev, ...next }));
  }, []);

  const mapRef = useRef<any>(null);

  const handleWidgetViewStateChange = useCallback(
    (next: WidgetViewStateChange) => {
      if (controller) {
        setViewState((prev) => applyWidgetViewStateChange(prev, next));
        return;
      }
      const map = mapRef.current?.getMap?.() ?? mapRef.current;
      if (!map) {
        return;
      }
      adapter.applyViewState(map, next);
    },
    [controller, adapter],
  );

  const handleMoveEnd = useCallback(
    (e: any) => {
      onViewportChange?.(e.viewState ?? e.detail ?? e);
    },
    [onViewportChange],
  );

  const handleScreenshotCapture = useCallback(
    async (widget: any) => {
      if (!adapter.captureScreenshot) {
        return;
      }
      const map = mapRef.current?.getMap?.() ?? mapRef.current;
      if (!map) {
        return;
      }
      const dataUrl = await adapter.captureScreenshot(map);
      if (dataUrl) {
        widget.downloadDataURL(dataUrl, widget.props.filename);
      }
    },
    [adapter],
  );

  const { themeMode, setThemeMode } = useProviderThemeMode(options.theme?.mode);

  useInitialViewportReport(initialViewState, viewState, onViewportChange);

  const mergedCallbacks = useProviderWidgetCallbacks({
    widgetCallbacks,
    onViewStateChange: handleWidgetViewStateChange,
    resetViewState: initialViewState,
    screenshot: adapter.captureScreenshot
      ? { onCapture: handleScreenshotCapture }
      : undefined,
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
    zoom: typeof next.delta === 'number'
      ? current.zoom + next.delta
      : typeof next.zoom === 'number'
        ? next.zoom
        : current.zoom,
    bearing: typeof next.bearing === 'number' ? next.bearing : current.bearing,
    pitch: typeof next.pitch === 'number' ? next.pitch : current.pitch,
  };
}

export function useProviderThemeMode(mode: MapThemeMode | undefined) {
  const initialThemeMode = useMemo(() => resolveInitialThemeMode(mode), [mode]);
  const [themeMode, setThemeMode] = useState<'light' | 'dark'>(initialThemeMode);

  useEffect(() => {
    setThemeMode(initialThemeMode);
  }, [initialThemeMode]);

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
  widgetCallbacks, onViewStateChange, resetViewState, themeMode, onThemeModeChange, screenshot,
}: {
  widgetCallbacks?: WidgetCallbacks;
  onViewStateChange: (next: WidgetViewStateChange) => void;
  resetViewState?: WidgetViewStateChange;
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

