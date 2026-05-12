import { useEffect, useRef } from 'react';
import { useLatestRef } from './useLatestRef';

export default function useAnimationFrame({
  enabled,
  interval,
  onUpdate,
}: {
  enabled: boolean;
  interval: number;
  onUpdate: (timestamp: number, delta: number) => void;
}) {
  const frameRef = useRef<number | null>(null);
  const lastFrameTime = useRef<number | null>(null);
  const onUpdateRef = useLatestRef(onUpdate);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const loop = (timestamp: number) => {
      const absoluteTimestamp = performance.timeOrigin + timestamp;
      if (lastFrameTime.current) {
        const delta = absoluteTimestamp - lastFrameTime.current;
        if (delta >= interval) {
          onUpdateRef.current(absoluteTimestamp, delta);
          lastFrameTime.current = absoluteTimestamp;
        }
      } else {
        lastFrameTime.current = absoluteTimestamp;
      }
      frameRef.current = requestAnimationFrame(loop);
    };

    lastFrameTime.current = null;
    frameRef.current = requestAnimationFrame(loop);
    return () => {
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
        lastFrameTime.current = null;
      }
    };
  }, [enabled, interval, onUpdateRef]);
}
