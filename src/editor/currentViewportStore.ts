import type { ViewportSnapshot } from '../components/map/types';

let currentViewport: ViewportSnapshot | null = null;
const listeners = new Set<() => void>();
let fitToDataRequestId = 0;
const fitToDataListeners = new Set<() => void>();

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

export function getFitToDataRequestId() {
  return fitToDataRequestId;
}

export function requestFitToDataCapture() {
  fitToDataRequestId += 1;
  for (const listener of fitToDataListeners) {
    listener();
  }
  return fitToDataRequestId;
}

export function subscribeFitToDataRequests(listener: () => void) {
  fitToDataListeners.add(listener);
  return () => {
    fitToDataListeners.delete(listener);
  };
}
