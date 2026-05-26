export type PlaybackState = {
  referenceStartTimeMs: number;
  playbackClockStartTimeMs: number | null;
  playbackSpeed: number;
  scrubbing: boolean;
  livePinned: boolean;
};

export type PlaybackAction =
  | { type: 'startPlay'; timeMs: number; nowMs: number; speed?: number }
  | { type: 'pause'; timeMs: number; nearLiveEdge: boolean; speed?: number }
  | { type: 'scrub'; timeMs: number; nearLiveEdge: boolean; speed?: number }
  | { type: 'pinLive'; toTimeMs: number }
  | { type: 'unpinLive' }
  | { type: 'reset'; timeMs: number };

export function playbackReducer(state: PlaybackState, action: PlaybackAction): PlaybackState {
  switch (action.type) {
    case 'startPlay':
      return {
        ...state,
        referenceStartTimeMs: action.timeMs,
        playbackClockStartTimeMs: action.nowMs,
        scrubbing: false,
        livePinned: false,
        ...(action.speed != null ? { playbackSpeed: action.speed } : {}),
      };
    case 'pause':
      return {
        ...state,
        referenceStartTimeMs: action.timeMs,
        playbackClockStartTimeMs: null,
        scrubbing: false,
        livePinned: action.nearLiveEdge,
        ...(action.speed != null ? { playbackSpeed: action.speed } : {}),
      };
    case 'scrub':
      return {
        ...state,
        referenceStartTimeMs: action.timeMs,
        playbackClockStartTimeMs: null,
        scrubbing: true,
        livePinned: action.nearLiveEdge,
        ...(action.speed != null ? { playbackSpeed: action.speed } : {}),
      };
    case 'pinLive':
      return {
        ...state,
        referenceStartTimeMs: action.toTimeMs,
        livePinned: true,
      };
    case 'unpinLive':
      return {
        ...state,
        livePinned: false,
      };
    case 'reset':
      return {
        ...state,
        referenceStartTimeMs: action.timeMs,
        playbackClockStartTimeMs: null,
        scrubbing: false,
        livePinned: false,
      };
  }
}

export function getRawCursorTimeMs(
  nowMs: number,
  referenceStartTimeMs: number,
  playbackClockStartTimeMs: number | null,
  playbackSpeed: number,
  fallbackTimeMs: number
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

  if (raw <= fromTimeMs) {
    return loop ? ((((raw - fromTimeMs) % span) + span) % span) + fromTimeMs : fromTimeMs;
  }

  if (!loop && raw >= toTimeMs) {
    return toTimeMs;
  }

  return ((((raw - fromTimeMs) % span) + span) % span) + fromTimeMs;
}
