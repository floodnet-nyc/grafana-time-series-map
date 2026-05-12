import { useCallback, useRef } from 'react'
import { useTimeout } from './useTimeout'

export default function useDebouncedCallback<T extends (...args: any[]) => void>(
  fn: T,
  delay: number,
) {
  const fnRef = useRef(fn)
  // eslint-disable-next-line react-hooks/refs
  fnRef.current = fn

  const schedule = useTimeout()

  return useCallback((...args: any[]) => {
    schedule(() => fnRef.current(...args), delay)
  }, [delay, schedule])
}
