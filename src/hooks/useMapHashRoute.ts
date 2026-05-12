import { useMemo } from 'react';
import useDebouncedCallback from './useDebouncedCallback';

const HASH_VIEW_KEY = 'v';
const HASH_WRITE_DEBOUNCE_MS = 1000;

export interface MapHashView {
  latitude: number;
  longitude: number;
  zoom: number;
  bearing: number;
  pitch: number;
}

function round(value: number, precision: number) {
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
}

export function parseMapHashView(): MapHashView | null {
  if (typeof window === 'undefined') {
    return null;
  }
  const hash = window.location.hash.replace(/^#/, '');
  const part = hash.split('&').find((item) => item.startsWith(`${HASH_VIEW_KEY}=`));
  if (!part) {
    return null;
  }
  const values = decodeURIComponent(part.slice(HASH_VIEW_KEY.length + 1)).split('/').map(Number);
  const [zoom, latitude, longitude, bearing = 0, pitch = 0] = values;
  if (![zoom, latitude, longitude, bearing, pitch].every(Number.isFinite)) {
    return null;
  }
  return { zoom, latitude, longitude, bearing, pitch };
}

function formatMapHashView(view: MapHashView): string {
  return [
    round(view.zoom, 2),
    round(view.latitude, 6),
    round(view.longitude, 6),
    round(view.bearing, 1),
    round(view.pitch, 1),
  ].join('/');
}

function getHashWithView(view: MapHashView) {
  const hash = window.location.hash.replace(/^#/, '');
  const parts = hash ? hash.split('&').filter(Boolean) : [];
  const nextPart = `${HASH_VIEW_KEY}=${formatMapHashView(view)}`;
  const index = parts.findIndex((part) => part.startsWith(`${HASH_VIEW_KEY}=`));
  if (index >= 0) {
    parts[index] = nextPart;
  } else {
    parts.push(nextPart);
  }
  return `#${parts.join('&')}`;
}

export function useInitialMapHashView(enabled: boolean): MapHashView | undefined {
  return useMemo(() => enabled ? parseMapHashView() ?? undefined : undefined, [enabled]);
}

export function useMapHashRoute(enabled: boolean, onHashView?: (view: MapHashView) => void) {
  const initialView = useInitialMapHashView(enabled);
  const writeHashView = useDebouncedCallback((view: MapHashView) => {
    if (enabled && typeof window !== 'undefined') {
      onHashView?.(view);
      const hashToWrite = getHashWithView(view);
      window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}${hashToWrite}`);
    }
  }, HASH_WRITE_DEBOUNCE_MS);
  return [initialView, writeHashView] as const;
}
