export type PlaybackState = {
  referenceStartTimeMs: number;
  playbackClockStartTimeMs: number | null;
  playbackSpeed: number;
  scrubbing: boolean;
};

export type PlaybackAction =
  | { type: 'startPlay'; timeMs: number; nowMs: number; speed?: number }
  | { type: 'pause'; timeMs: number; speed?: number }
  | { type: 'scrub'; timeMs: number; speed?: number }
  | { type: 'reset'; timeMs: number };

export function playbackReducer(state: PlaybackState, action: PlaybackAction): PlaybackState {
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

export function getRawCursorTimeMs(
  nowMs: number,
  referenceStartTimeMs: number,
  playbackClockStartTimeMs: number | null,
  playbackSpeed: number,
  fallbackTimeMs: number,
): number {
  if (!playbackClockStartTimeMs) {
    return fallbackTimeMs;
  }

  const deltaMs = nowMs - playbackClockStartTimeMs;
  return referenceStartTimeMs + (deltaMs * playbackSpeed) / 1000;
}

export function normalizeCursorTimeMs(raw: number, fromTimeMs: number, toTimeMs: number, loop: boolean): number {
  const span = toTimeMs - fromTimeMs;
  if (span <= 0) {
    return toTimeMs;
  }

  if (!loop && raw >= toTimeMs) {
    return toTimeMs;
  }

  return ((raw - fromTimeMs) % span) + fromTimeMs;
}
