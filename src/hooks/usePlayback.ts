import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react';
import useAnimationFrame from './useAnimationFrame';

type PlaybackState = {
  referenceStartTimeMs: number;
  playbackClockStartTimeMs: number | null;
  playbackSpeed: number;
  scrubbing: boolean;
};

type PlaybackAction =
  | { type: 'startPlay'; timeMs: number; nowMs: number; speed?: number }
  | { type: 'pause'; timeMs: number; speed?: number }
  | { type: 'scrub'; timeMs: number; speed?: number }
  | { type: 'reset'; timeMs: number };

function playbackReducer(state: PlaybackState, action: PlaybackAction): PlaybackState {
  switch (action.type) {
    case 'startPlay':
      return {
        ...state,
        referenceStartTimeMs: action.timeMs,
        playbackClockStartTimeMs: action.nowMs,
        scrubbing: false,
        ...(action.speed != null ? { playbackSpeed: action.speed } : {}),
      };
    case 'pause':
      return {
        ...state,
        referenceStartTimeMs: action.timeMs,
        playbackClockStartTimeMs: null,
        scrubbing: false,
        ...(action.speed != null ? { playbackSpeed: action.speed } : {}),
      };
    case 'scrub':
      return {
        ...state,
        referenceStartTimeMs: action.timeMs,
        playbackClockStartTimeMs: null,
        scrubbing: true,
        ...(action.speed != null ? { playbackSpeed: action.speed } : {}),
      };
    case 'reset':
      return {
        ...state,
        referenceStartTimeMs: action.timeMs,
        playbackClockStartTimeMs: null,
        scrubbing: false,
      };
  }
}

function getRawCursorTimeMs(
  nowMs: number,
  referenceStartTimeMs: number,
  playbackClockStartTimeMs: number | null,
  playbackSpeed: number,
  cursorTimeMsRef: React.RefObject<number>,
): number {
  if (!playbackClockStartTimeMs) return cursorTimeMsRef.current ?? referenceStartTimeMs;
  const dt = nowMs - playbackClockStartTimeMs;
  return referenceStartTimeMs + (dt * playbackSpeed) / 1000;
}

function loopCursorTimeMs(
  raw: number,
  fromTimeMs: number,
  toTimeMs: number,
  loop: boolean,
): number {
  const span = toTimeMs - fromTimeMs;
  if (span <= 0) return toTimeMs;
  if (!loop && raw >= toTimeMs) return toTimeMs;
  return ((raw - fromTimeMs) % span) + fromTimeMs;
}

export interface UsePlaybackResult {
  cursorTimeMs: number;
  playing: boolean;
  scrubbing: boolean;
  playbackSpeed: number;
  play(): void;
  pause(): void;
  scrubTo(ms: number): void;
  setSpeed(ms: number): void;
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

  // Tick counter to force cursorTimeMs re-evaluation on each animation frame
  const [tick, setTick] = useReducer((n: number) => n + 1, 0);

  const getCursor = useCallback(
    (nowMs: number = Date.now()) => {
      const raw = getRawCursorTimeMs(
        nowMs,
        referenceStartTimeMs,
        playbackClockStartTimeMs,
        playbackSpeed,
        cursorTimeMsRef,
      );
      const clamped = loopCursorTimeMs(raw, fromTimeMs, toTimeMs, loop);
      cursorTimeMsRef.current = clamped;
      return clamped;
    },
    [referenceStartTimeMs, playbackClockStartTimeMs, playbackSpeed, fromTimeMs, toTimeMs, loop],
  );

  useAnimationFrame({
    enabled: playing,
    interval: 80,
    onUpdate: (t) => {
      const raw = getRawCursorTimeMs(
        t,
        referenceStartTimeMs,
        playbackClockStartTimeMs,
        playbackSpeed,
        cursorTimeMsRef,
      );
      if (!loop && raw >= toTimeMs) {
        cursorTimeMsRef.current = toTimeMs;
        dispatch({ type: 'pause', timeMs: toTimeMs });
      }
      setTick();
    },
  });

  // Compute current cursor from latest state; tick in deps forces re-eval on each animation frame
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const cursorTimeMs = useMemo(() => getCursor(), [getCursor, tick]);

  // Reset cursor when time range shifts out of bounds
  useEffect(() => {
    if (cursorTimeMsRef.current < fromTimeMs || cursorTimeMsRef.current > toTimeMs) {
      cursorTimeMsRef.current = fromTimeMs;
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
    dispatch({ type: 'scrub', timeMs: ms });
  }, []);

  const setSpeed = useCallback((speed: number) => {
    dispatch({ type: 'pause', timeMs: cursorTimeMsRef.current, speed });
  }, []);

  return { cursorTimeMs, playing, scrubbing, playbackSpeed, play, pause, scrubTo, setSpeed };
}
