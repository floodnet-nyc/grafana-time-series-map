import { useEffect, useRef } from 'react';

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
  const onUpdateRef = useRef(onUpdate);
  // eslint-disable-next-line react-hooks/refs
  onUpdateRef.current = onUpdate; 

  useEffect(() => {
    if (!enabled) return;
    const loop = (timestamp: number) => {
      timestamp = performance.timeOrigin + timestamp;
      if (lastFrameTime.current) {
        const delta = timestamp - lastFrameTime.current;
        if (delta >= interval) {
          onUpdateRef.current(timestamp, delta);
          lastFrameTime.current = timestamp;
        }
      } else {
        lastFrameTime.current = timestamp;
      }
      frameRef.current = requestAnimationFrame(loop);
    };

    lastFrameTime.current = null;
    frameRef.current = requestAnimationFrame(loop);
    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
        lastFrameTime.current = null;
      }
    };
  }, [enabled, interval]);
}
