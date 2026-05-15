import type { ViewportSnapshot } from '../components/map/types';

let currentViewport: ViewportSnapshot | null = null;
const listeners = new Set<() => void>();

export function getCurrentViewportSnapshot() {
  return currentViewport;
}

export function setCurrentViewportSnapshot(viewport: ViewportSnapshot | null) {
  currentViewport = viewport;
  for (const listener of listeners) {
    listener();
  }
}

export function subscribeCurrentViewportSnapshot(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
