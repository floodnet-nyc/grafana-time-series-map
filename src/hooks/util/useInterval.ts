import { useEffect } from 'react';
import { useLatestRef } from './useLatestRef';

/**
 * Returns a stable `schedule(fn, delay)` function that cancels any pending
 * timer before scheduling a new one. The pending timer is also cancelled on
 * unmount. Use this as the shared primitive under debounce/throttle hooks.
 */
export function useInterval(fn: () => void, interval?: number) {
  const fnRef = useLatestRef(fn);
  // Publish cursor position while playing
  useEffect(() => {
    if (!interval) { return; }
    const intervalId = setInterval(() => fnRef.current?.(), interval);
    return () => clearInterval(intervalId);
  }, [fnRef, interval]);
}
