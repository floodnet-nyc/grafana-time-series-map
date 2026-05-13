import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import useAnimationFrame from './util/useAnimationFrame';
import { getRawCursorTimeMs, normalizeCursorTimeMs, playbackReducer } from '../utils/playback/playbackModel';

export interface UsePlaybackResult {
  cursorTimeMs: number;
  playing: boolean;
  scrubbing: boolean;
  playbackSpeed: number;
  play(): void;
  pause(): void;
  scrubTo(ms: number): void;
  /** Move cursor to ms and pause — keeps scrubbing:false so external callers can keep driving. */
  seekTo(ms: number): void;
  setSpeed(speed: number): void;
}

export function usePlayback({
  fromTimeMs,
  toTimeMs,
  defaultPlaybackSpeed,
  loop,
}: {
  fromTimeMs: number;
  toTimeMs: number;
  defaultPlaybackSpeed: number;
  loop: boolean;
}): UsePlaybackResult {
  const [playback, dispatch] = useReducer(playbackReducer, {
    referenceStartTimeMs: fromTimeMs,
    playbackClockStartTimeMs: null,
    playbackSpeed: defaultPlaybackSpeed,
    scrubbing: false,
  });

  const { referenceStartTimeMs, playbackClockStartTimeMs, playbackSpeed, scrubbing } = playback;
  const playing = !!playbackClockStartTimeMs;

  const cursorTimeMsRef = useRef<number>(fromTimeMs);
  const [cursorTimeMs, setCursorTimeMs] = useState(fromTimeMs);

  useAnimationFrame({
    enabled: playing && fromTimeMs < toTimeMs,
    interval: 80,
    onUpdate: (timestampMs: number) => {
      const raw = getRawCursorTimeMs(
        timestampMs,
        referenceStartTimeMs,
        playbackClockStartTimeMs,
        playbackSpeed,
        cursorTimeMsRef.current,
      );

      if (!loop && raw >= toTimeMs) {
        cursorTimeMsRef.current = toTimeMs;
        setCursorTimeMs(toTimeMs);
        dispatch({ type: 'pause', timeMs: toTimeMs });
        return;
      }

      const nextCursorTimeMs = normalizeCursorTimeMs(raw, fromTimeMs, toTimeMs, loop);
      cursorTimeMsRef.current = nextCursorTimeMs;
      setCursorTimeMs(nextCursorTimeMs);
    },
  });

  // Reset cursor when time range shifts out of bounds (skip zero-duration ranges)
  useEffect(() => {
    if (fromTimeMs >= toTimeMs) { return; }
    if (cursorTimeMsRef.current < fromTimeMs || cursorTimeMsRef.current > toTimeMs) {
      cursorTimeMsRef.current = fromTimeMs;
      setCursorTimeMs(fromTimeMs);
      dispatch({ type: 'reset', timeMs: fromTimeMs });
    }
  }, [fromTimeMs, toTimeMs]);

  const play = useCallback(() => {
    dispatch({ type: 'startPlay', timeMs: cursorTimeMsRef.current, nowMs: Date.now() });
  }, []);

  const pause = useCallback(() => {
    dispatch({ type: 'pause', timeMs: cursorTimeMsRef.current });
  }, []);

  const scrubTo = useCallback((ms: number) => {
    cursorTimeMsRef.current = ms;
    setCursorTimeMs(ms);
    dispatch({ type: 'scrub', timeMs: ms });
  }, []);

  const seekTo = useCallback((ms: number) => {
    cursorTimeMsRef.current = ms;
    setCursorTimeMs(ms);
    dispatch({ type: 'pause', timeMs: ms });
  }, []);

  const setSpeed = useCallback((speed: number) => {
    dispatch({ type: 'pause', timeMs: cursorTimeMsRef.current, speed });
  }, []);

  return { cursorTimeMs, playing, scrubbing, playbackSpeed, play, pause, scrubTo, seekTo, setSpeed };
}
