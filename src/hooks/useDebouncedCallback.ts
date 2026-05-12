import { useCallback, useRef } from 'react'
import { useTimeout } from './useTimeout'

export default function useDebouncedCallback<T extends (...args: any[]) => void>(
  fn: T,
  delay: number,
  deps: any[] = [],
) {
  const fnRef = useRef(fn)
  fnRef.current = fn

  const schedule = useTimeout()

  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useCallback((...args: any[]) => {
    schedule(() => fnRef.current(...args), delay)
  }, [delay, schedule, ...deps])
}
