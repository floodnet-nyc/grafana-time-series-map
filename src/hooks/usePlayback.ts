import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import useAnimationFrame from './util/useAnimationFrame';
import { getRawCursorTimeMs, normalizeCursorTimeMs, playbackReducer, selectSpeedOptions } from '../utils/playback/playbackModel';

const LIVE_PIN_TOLERANCE_MS = 1000;

type CursorUpdate = {
  timeMs?: number;
  play?: boolean | ((prev: boolean) => boolean);
  scrubbing?: boolean;
  playbackSpeed?: number;
};

export interface UsePlaybackResult {
  cursorTimeMs: number;
  cursorTimeMsRef: React.RefObject<number>;
  getCursorTimeMs(nowMs?: number): number;
  playing: boolean;
  scrubbing: boolean;
  followLive: boolean;
  playbackSpeed: number;
  speeds: number[];
  setCursorState(update?: CursorUpdate): void;
  play(): void;
  pause(): void;
  scrubTo(ms: number): void;
  /** Move cursor to ms and pause — keeps scrubbing:false so external callers can keep driving. */
  seekTo(ms: number, pause?: boolean): void;
  setSpeed(speed: number): void;
}

export function usePlayback({
  fromTimeMs,
  toTimeMs,
  defaultPlaybackSpeed,
  loop,
  live = false,
}: {
  fromTimeMs: number;
  toTimeMs: number;
  defaultPlaybackSpeed: number;
  loop: boolean;
  live?: boolean;
}): UsePlaybackResult {
  const [defaultSpeed, speeds] = useMemo(() => selectSpeedOptions({
    rangeMs: toTimeMs - fromTimeMs,
    defaultSpeed: defaultPlaybackSpeed,
  }), [fromTimeMs, toTimeMs, defaultPlaybackSpeed]);
  const initialCursorTimeMs = live ? toTimeMs : fromTimeMs;
  const [playback, dispatch] = useReducer(playbackReducer, {
    referenceStartTimeMs: initialCursorTimeMs,
    playbackClockStartTimeMs: null,
    playbackSpeed: defaultSpeed,
    scrubbing: false,
    livePinned: live,
  });
  const { referenceStartTimeMs, playbackClockStartTimeMs, playbackSpeed, scrubbing, livePinned } = playback;
  const playing = !!playbackClockStartTimeMs;
  const followLive = live && livePinned && !playing && !scrubbing;
  const playbackRef = useRef(playback);
  playbackRef.current = playback;

  const cursorTimeMsRef = useRef<number>(initialCursorTimeMs);
  const [cursorTimeMs, setCursorTimeMs] = useState(initialCursorTimeMs);

  const syncCursorTime = useCallback((timeMs: number) => {
    cursorTimeMsRef.current = timeMs;
    setCursorTimeMs(timeMs);
  }, []);

  const getCursorTimeMs = useCallback((nowMs?: number) => {
    const currentNowMs = nowMs ?? performance.timeOrigin + performance.now();
    const currentPlayback = playbackRef.current;
    const raw = getRawCursorTimeMs(
      currentNowMs,
      currentPlayback.referenceStartTimeMs,
      currentPlayback.playbackClockStartTimeMs,
      currentPlayback.playbackSpeed,
      cursorTimeMsRef.current,
    );
    return normalizeCursorTimeMs(raw, fromTimeMs, toTimeMs, loop);
  }, [fromTimeMs, loop, toTimeMs]);

  const setCursorState = useCallback((update: CursorUpdate = {}) => {
    const nowMs = performance.timeOrigin + performance.now();
    const currentPlayback = playbackRef.current;
    const rawTimeMs = update.timeMs ?? getRawCursorTimeMs(
      nowMs,
      currentPlayback.referenceStartTimeMs,
      currentPlayback.playbackClockStartTimeMs,
      currentPlayback.playbackSpeed,
      cursorTimeMsRef.current,
    );
    const nextTimeMs = normalizeCursorTimeMs(rawTimeMs, fromTimeMs, toTimeMs, loop);
    const resolvedPlay = typeof update.play === 'function' ? update.play(!!currentPlayback.playbackClockStartTimeMs) : update.play;
    const nearLiveEdge = live && Math.abs(toTimeMs - nextTimeMs) <= LIVE_PIN_TOLERANCE_MS;

    syncCursorTime(nextTimeMs);

    if (resolvedPlay === true) {
      const action = { type: 'startPlay' as const, timeMs: nextTimeMs, nowMs, speed: update.playbackSpeed };
      playbackRef.current = playbackReducer(currentPlayback, action);
      dispatch(action);
      return;
    }

    if (update.scrubbing) {
      const action = { type: 'scrub' as const, timeMs: nextTimeMs, nearLiveEdge, speed: update.playbackSpeed };
      playbackRef.current = playbackReducer(currentPlayback, action);
      dispatch(action);
      return;
    }

    const action = { type: 'pause' as const, timeMs: nextTimeMs, nearLiveEdge, speed: update.playbackSpeed };
    playbackRef.current = playbackReducer(currentPlayback, action);
    dispatch(action);
  }, [fromTimeMs, live, loop, syncCursorTime, toTimeMs]);

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
        setCursorState({ timeMs: toTimeMs, play: false });
        return;
      }

      const nextCursorTimeMs = normalizeCursorTimeMs(raw, fromTimeMs, toTimeMs, loop);
      syncCursorTime(nextCursorTimeMs);
    },
  });

  useEffect(() => {
    if (!live) {
      const action = { type: 'unpinLive' as const };
      playbackRef.current = playbackReducer(playbackRef.current, action);
      dispatch(action);
    }
  }, [live]);

  useEffect(() => {
    if (followLive) {
      syncCursorTime(toTimeMs);
      const action = { type: 'pinLive' as const, toTimeMs };
      playbackRef.current = playbackReducer(playbackRef.current, action);
      dispatch(action);
    }
  }, [followLive, syncCursorTime, toTimeMs]);

  // Reset cursor when time range shifts out of bounds (skip zero-duration ranges)
  useEffect(() => {
    if (fromTimeMs >= toTimeMs) { return; }
    if (cursorTimeMsRef.current < fromTimeMs || cursorTimeMsRef.current > toTimeMs) {
      setCursorState({ timeMs: fromTimeMs, play: false });
    }
  }, [fromTimeMs, setCursorState, toTimeMs]);

  const play = useCallback(() => {
    setCursorState({ play: true });
  }, [setCursorState]);

  const pause = useCallback(() => {
    setCursorState({ play: false });
  }, [setCursorState]);

  const scrubTo = useCallback((ms: number) => {
    setCursorState({ timeMs: ms, scrubbing: true });
  }, [setCursorState]);

  const seekTo = useCallback((ms: number, pause = true) => {
    setCursorState({ timeMs: ms, play: pause ? false : (prev) => prev });
  }, [setCursorState]);

  const setSpeed = useCallback((speed: number) => {
    setCursorState({ playbackSpeed: speed, play: false });
  }, [setCursorState]);

  return {
    cursorTimeMs,
    cursorTimeMsRef,
    getCursorTimeMs,
    playing,
    scrubbing,
    followLive,
    playbackSpeed,
    speeds,
    setCursorState,
    play,
    pause,
    scrubTo,
    seekTo,
    setSpeed,
  };
}
