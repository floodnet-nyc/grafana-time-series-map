import { useCallback, useEffect, useMemo, useRef } from 'react';

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

export function useMapHashRoute(enabled: boolean, onHashView?: (view: MapHashView) => void) {
  const onHashViewRef = useRef(onHashView);
  const lastWrittenHashRef = useRef<string | null>(null);
  const pendingHashRef = useRef<string | null>(null);
  const pendingWriteTimerRef = useRef<number | null>(null);
  const initialView = useMemo(() => enabled ? parseMapHashView() : null, [enabled]);

  const clearPendingWrite = useCallback(() => {
    if (pendingWriteTimerRef.current) {
      window.clearTimeout(pendingWriteTimerRef.current);
      pendingWriteTimerRef.current = null;
    }
    pendingHashRef.current = null;
  }, []);

  useEffect(() => {
    onHashViewRef.current = onHashView;
  }, [onHashView]);

  const writeHashView = useCallback((view: MapHashView) => {
    if (!enabled || typeof window === 'undefined') {
      return;
    }
    const nextHash = getHashWithView(view);
    clearPendingWrite();

    if (window.location.hash === nextHash) {
      lastWrittenHashRef.current = nextHash;
      return;
    }

    pendingHashRef.current = nextHash;
    pendingWriteTimerRef.current = window.setTimeout(() => {
      const hashToWrite = pendingHashRef.current;
      pendingHashRef.current = null;
      pendingWriteTimerRef.current = null;

      if (!hashToWrite || window.location.hash === hashToWrite) {
        if (hashToWrite) {
          lastWrittenHashRef.current = hashToWrite;
        }
        return;
      }

      lastWrittenHashRef.current = hashToWrite;
      window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}${hashToWrite}`);
    }, HASH_WRITE_DEBOUNCE_MS);
  }, [clearPendingWrite, enabled]);

  useEffect(() => {
    if (!enabled) {
      clearPendingWrite();
    }

    return clearPendingWrite;
  }, [clearPendingWrite, enabled]);

  useEffect(() => {
    if (!enabled || !onHashView) {
      return;
    }
    const applyHashView = () => {
      if (window.location.hash === lastWrittenHashRef.current) {
        return;
      }
      const view = parseMapHashView();
      if (view) {
        onHashViewRef.current?.(view);
      }
    };
    applyHashView();
    window.addEventListener('hashchange', applyHashView);
    return () => {
      window.removeEventListener('hashchange', applyHashView);
    };
  }, [enabled, onHashView]);

  return { initialView, writeHashView };
}
