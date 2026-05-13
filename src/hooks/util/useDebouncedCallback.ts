import { useCallback } from 'react';
import { useLatestRef } from './useLatestRef';
import { useTimeout } from './useTimeout';

export default function useDebouncedCallback<T extends (...args: any[]) => void>(
  fn: T,
  delay: number,
) {
  const fnRef = useLatestRef(fn);
  const schedule = useTimeout();

  return useCallback((...args: any[]) => {
    schedule(() => fnRef.current(...args), delay);
  }, [delay, fnRef, schedule]);
}
