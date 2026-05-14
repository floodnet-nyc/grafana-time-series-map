import { useCallback, useRef } from 'react';
import { useLatestRef } from './useLatestRef';
import { useTimeout } from './useTimeout';

export default function useDebouncedCallback<T extends (...args: any[]) => void>(
  fn: T,
  delay: number,
  interval?: number,
) {
  const fnRef = useLatestRef(fn);
  const schedule = useTimeout();
  const lastInvokeRef = useRef<number>(0);

  return useCallback((...args: Parameters<T>) => {
    const now = Date.now();
    const timeSinceLastInvoke = now - lastInvokeRef.current;

    if (interval !== undefined && timeSinceLastInvoke >= interval) {
      fnRef.current(...args);
      lastInvokeRef.current = now;
    } else {
      schedule(() => {
        fnRef.current(...args);
        lastInvokeRef.current = Date.now();
      }, delay);
    }
  }, [delay, interval, fnRef, schedule]);
}
