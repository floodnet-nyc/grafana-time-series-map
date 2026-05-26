import { act, renderHook } from '@testing-library/react';
import useAnimationFrame from './util/useAnimationFrame';
import { usePlayback } from './usePlayback';

jest.mock('./util/useAnimationFrame', () => ({
  __esModule: true,
  default: jest.fn(),
}));

const mockUseAnimationFrame = useAnimationFrame as jest.MockedFunction<typeof useAnimationFrame>;

describe('usePlayback', () => {
  let latestAnimationConfig:
    | { onUpdate: (timestamp: number, delta: number) => void; enabled: boolean; interval: number }
    | undefined;

  beforeEach(() => {
    latestAnimationConfig = undefined;
    mockUseAnimationFrame.mockImplementation((config) => {
      latestAnimationConfig = config;
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('initializes with the starting range values', () => {
    const { result } = renderHook(() =>
      usePlayback({
        fromTimeMs: 1000,
        toTimeMs: 2000,
        defaultPlaybackSpeed: 1,
        loop: false,
      })
    );

    expect(result.current.cursorTimeMs).toBe(1000);
    expect(result.current.cursorTimeMsRef.current).toBe(1000);
    expect(result.current.playing).toBe(false);
    expect(result.current.scrubbing).toBe(false);
    expect(result.current.followLive).toBe(false);
    expect(result.current.playbackSpeed).toBe(1);
  });

  it('supports scrubbing, seeking, and speed changes', () => {
    const { result } = renderHook(() =>
      usePlayback({
        fromTimeMs: 1000,
        toTimeMs: 2000,
        defaultPlaybackSpeed: 1,
        loop: false,
      })
    );

    act(() => {
      result.current.scrubTo(1300);
    });
    expect(result.current.cursorTimeMs).toBe(1300);
    expect(result.current.scrubbing).toBe(true);

    act(() => {
      result.current.seekTo(1500);
    });
    expect(result.current.cursorTimeMs).toBe(1500);
    expect(result.current.scrubbing).toBe(false);

    act(() => {
      result.current.setSpeed(3);
    });
    expect(result.current.playbackSpeed).toBe(3);
    expect(result.current.playing).toBe(false);
  });

  it('preserves play state when seeking with pause disabled', () => {
    jest.spyOn(performance, 'now').mockReturnValue(5000);

    const { result } = renderHook(() =>
      usePlayback({
        fromTimeMs: 1000,
        toTimeMs: 2000,
        defaultPlaybackSpeed: 1,
        loop: false,
      })
    );

    act(() => {
      result.current.play();
      result.current.seekTo(1600, false);
    });

    expect(result.current.cursorTimeMs).toBe(1600);
    expect(result.current.playing).toBe(true);
  });

  it('advances and pauses via the animation frame callback', () => {
    jest.spyOn(performance, 'now').mockReturnValue(5000);

    const { result } = renderHook(() =>
      usePlayback({
        fromTimeMs: 1000,
        toTimeMs: 2000,
        defaultPlaybackSpeed: 2,
        loop: false,
      })
    );

    act(() => {
      result.current.seekTo(1200);
      result.current.play();
    });

    expect(result.current.playing).toBe(true);
    expect(latestAnimationConfig?.enabled).toBe(true);

    act(() => {
      latestAnimationConfig?.onUpdate(performance.timeOrigin + 5500, 500);
    });
    expect(result.current.cursorTimeMs).toBe(1201);

    act(() => {
      latestAnimationConfig?.onUpdate(performance.timeOrigin + 405000, 500);
    });
    expect(result.current.cursorTimeMs).toBe(2000);
    expect(result.current.playing).toBe(false);
  });

  it('resets the cursor when the active range no longer contains it', () => {
    const { result, rerender } = renderHook(
      ({ fromTimeMs, toTimeMs }) =>
        usePlayback({
          fromTimeMs,
          toTimeMs,
          defaultPlaybackSpeed: 1,
          loop: false,
        }),
      {
        initialProps: { fromTimeMs: 1000, toTimeMs: 2000 },
      }
    );

    act(() => {
      result.current.seekTo(1800);
    });
    expect(result.current.cursorTimeMs).toBe(1800);

    rerender({ fromTimeMs: 2000, toTimeMs: 3000 });
    expect(result.current.cursorTimeMs).toBe(2000);
  });

  it('pins to the live edge across refreshes until the user scrubs away', () => {
    const { result, rerender } = renderHook(
      ({ fromTimeMs, toTimeMs }) =>
        usePlayback({
          fromTimeMs,
          toTimeMs,
          defaultPlaybackSpeed: 1,
          loop: false,
          live: true,
        }),
      {
        initialProps: { fromTimeMs: 1000, toTimeMs: 2000 },
      }
    );

    expect(result.current.cursorTimeMs).toBe(2000);
    expect(result.current.followLive).toBe(true);

    rerender({ fromTimeMs: 1100, toTimeMs: 2100 });
    expect(result.current.cursorTimeMs).toBe(2100);
    expect(result.current.followLive).toBe(true);

    act(() => {
      result.current.scrubTo(1800);
    });
    expect(result.current.followLive).toBe(false);

    rerender({ fromTimeMs: 1200, toTimeMs: 2200 });
    expect(result.current.cursorTimeMs).toBe(1800);
  });
});
