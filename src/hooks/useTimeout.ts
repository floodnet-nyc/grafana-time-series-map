import { useCallback, useEffect, useRef } from 'react'

/**
 * Returns a stable `schedule(fn, delay)` function that cancels any pending
 * timer before scheduling a new one. The pending timer is also cancelled on
 * unmount. Use this as the shared primitive under debounce/throttle hooks.
 */
export function useTimeout(): (fn: () => void, delay: number) => void {
  const timerRef = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current)
    }
  }, [])

  return useCallback((fn: () => void, delay: number) => {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current)
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null
      fn()
    }, delay)
  }, [])
}
