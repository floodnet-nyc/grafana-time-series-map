import { useMemo } from 'react';
import useDebouncedCallback from './useDebouncedCallback';
import { parseMapHashViewFromHash, upsertMapHashView } from './mapHashRouteModel';

const HASH_WRITE_DEBOUNCE_MS = 1000;

export interface MapHashView {
  latitude: number;
  longitude: number;
  zoom: number;
  bearing: number;
  pitch: number;
}

export function parseMapHashView(): MapHashView | null {
  if (typeof window === 'undefined') {
    return null;
  }
  return parseMapHashViewFromHash(window.location.hash);
}

export function useInitialMapHashView(enabled: boolean): MapHashView | undefined {
  return useMemo(() => enabled ? parseMapHashView() ?? undefined : undefined, [enabled]);
}

export function useMapHashRoute(enabled: boolean, onHashView?: (view: MapHashView) => void) {
  const initialView = useInitialMapHashView(enabled);
  const writeHashView = useDebouncedCallback((view: MapHashView) => {
    if (enabled && typeof window !== 'undefined') {
      onHashView?.(view);
      const hashToWrite = upsertMapHashView(window.location.hash, view);
      window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}${hashToWrite}`);
    }
  }, HASH_WRITE_DEBOUNCE_MS);
  return [initialView, writeHashView] as const;
}
