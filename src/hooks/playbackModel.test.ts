import { getRawCursorTimeMs, normalizeCursorTimeMs, playbackReducer, type PlaybackState } from './playbackModel';

describe('playbackModel', () => {
  const baseState: PlaybackState = {
    referenceStartTimeMs: 1000,
    playbackClockStartTimeMs: null,
    playbackSpeed: 2,
    scrubbing: false,
  };

  it('updates state for play, pause, scrub, and reset actions', () => {
    expect(playbackReducer(baseState, { type: 'startPlay', timeMs: 1200, nowMs: 5000 })).toEqual({
      ...baseState,
      referenceStartTimeMs: 1200,
      playbackClockStartTimeMs: 5000,
      scrubbing: false,
    });

    expect(playbackReducer(baseState, { type: 'pause', timeMs: 1300, speed: 4 })).toEqual({
      ...baseState,
      referenceStartTimeMs: 1300,
      playbackClockStartTimeMs: null,
      playbackSpeed: 4,
      scrubbing: false,
    });

    expect(playbackReducer(baseState, { type: 'scrub', timeMs: 1400 })).toEqual({
      ...baseState,
      referenceStartTimeMs: 1400,
      playbackClockStartTimeMs: null,
      scrubbing: true,
    });

    expect(playbackReducer(baseState, { type: 'reset', timeMs: 1500 })).toEqual({
      ...baseState,
      referenceStartTimeMs: 1500,
      playbackClockStartTimeMs: null,
      scrubbing: false,
    });
  });

  it('computes raw cursor time from the playback clock', () => {
    expect(getRawCursorTimeMs(2500, 1000, null, 1, 1200)).toBe(1200);
    expect(getRawCursorTimeMs(2500, 1000, 2000, 2, 1200)).toBe(1001);
  });

  it('normalizes cursor time with clamping and looping', () => {
    expect(normalizeCursorTimeMs(3000, 1000, 2000, false)).toBe(2000);
    expect(normalizeCursorTimeMs(2500, 1000, 2000, true)).toBe(1500);
    expect(normalizeCursorTimeMs(1000, 1000, 1000, true)).toBe(1000);
  });
});
