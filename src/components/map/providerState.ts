import { useEffect, useMemo, useState } from 'react';
import type { MapThemeMode } from '../../types';
import type { WidgetCallbacks, WidgetViewStateChange } from '../../widgets/types';
import type { ViewportSnapshot } from './types';
import { resolveInitialThemeMode } from './theme';

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
  onViewportChange?: (viewport: ViewportSnapshot) => void,
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
    [widgetCallbacks, onViewStateChange, resetViewState, screenshot, themeMode, onThemeModeChange],
  );
}
