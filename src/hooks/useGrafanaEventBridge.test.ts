import { act, renderHook } from '@testing-library/react';
import { DataHoverClearEvent, DataHoverEvent, DataSelectEvent, type EventBus } from '@grafana/data';
import { useGrafanaEventBridge } from './useGrafanaEventBridge';
import type { UsePlaybackResult } from './usePlayback';

const mockLocationServicePartial = jest.fn();

jest.mock('@grafana/runtime', () => ({
  locationService: {
    partial: (...args: unknown[]) => mockLocationServicePartial(...args),
  },
}));

type Subscriber<T> = {
  eventType: new (...args: any[]) => T;
  handler: (event: T) => void;
};

function createEventBus() {
  const subscribers: Array<Subscriber<any>> = [];
  const published: unknown[] = [];

  const eventBus = {
    publish: jest.fn((event: unknown) => {
      published.push(event);
    }),
    subscribe: jest.fn((eventType: new (...args: any[]) => any, handler: (event: unknown) => void) => {
      const subscription = { eventType, handler };
      subscribers.push(subscription);
      return {
        unsubscribe: () => {
          const index = subscribers.indexOf(subscription);
          if (index >= 0) {
            subscribers.splice(index, 1);
          }
        },
      };
    }),
  } as unknown as EventBus;

  return { eventBus, subscribers, published };
}

function createPlayback(overrides: Partial<UsePlaybackResult> = {}): UsePlaybackResult {
  return {
    cursorTimeMs: 1500,
    cursorTimeMsRef: { current: 1500 },
    getCursorTimeMs: jest.fn(() => 1500),
    playing: false,
    scrubbing: false,
    followLive: false,
    playbackSpeed: 1,
    speeds: [0.25, 0.5, 1, 2, 4],
    setCursorState: jest.fn(),
    play: jest.fn(),
    pause: jest.fn(),
    scrubTo: jest.fn(),
    seekTo: jest.fn(),
    setSpeed: jest.fn(),
    ...overrides,
  };
}

function renderBridge(
  eventBus: EventBus,
  playback: UsePlaybackResult,
  overrides: Partial<Parameters<typeof useGrafanaEventBridge>[0]> = {}
) {
  return renderHook(() =>
    useGrafanaEventBridge({
      eventBus,
      replaceVariables: (value: string) => value,
      playback,
      fromTimeMs: 1000,
      toTimeMs: 2000,
      publish: true,
      subscribe: true,
      publishSelection: true,
      subscribeSelection: true,
      ...overrides,
    })
  );
}

describe('useGrafanaEventBridge', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  it('supports local selection and clears on DataHoverClearEvent', () => {
    const { eventBus, subscribers } = createEventBus();
    const { result } = renderBridge(eventBus, createPlayback());

    act(() => {
      result.current.setSelectedKey('sensor-1');
    });
    expect(result.current.selectedKey).toBe('sensor-1');

    const clearSubscriber = subscribers.find((subscriber) => subscriber.eventType === DataHoverClearEvent);
    expect(clearSubscriber).toBeDefined();

    act(() => {
      clearSubscriber?.handler(new DataHoverClearEvent());
    });
    expect(result.current.selectedKey).toBeNull();
  });

  it('publishes selection changes when enabled', () => {
    const { eventBus, published } = createEventBus();
    const { result } = renderBridge(eventBus, createPlayback());

    act(() => {
      result.current.setSelectedKey('sensor-1');
    });
    expect(published.at(-1)).toBeInstanceOf(DataSelectEvent);

    act(() => {
      result.current.setSelectedKey(null);
    });
    expect(published.at(-1)).toBeInstanceOf(DataHoverClearEvent);
  });

  it('does not publish selection changes when publishSelection is disabled', () => {
    const { eventBus, published } = createEventBus();
    const { result } = renderBridge(eventBus, createPlayback(), { publishSelection: false });

    act(() => {
      result.current.setSelectedKey('sensor-1');
    });

    expect(published).toHaveLength(0);
  });

  it('writes the configured dashboard variable when local selection changes', () => {
    const { eventBus } = createEventBus();
    const { result } = renderBridge(eventBus, createPlayback(), {
      selectionVariableName: 'selected_sensor',
    });

    act(() => {
      result.current.setSelectedKey('sensor-1');
    });
    expect(mockLocationServicePartial).toHaveBeenLastCalledWith({ 'var-selected_sensor': 'sensor-1' }, true);

    act(() => {
      result.current.setSelectedKey(null);
    });
    expect(mockLocationServicePartial).toHaveBeenLastCalledWith({ 'var-selected_sensor': '' }, true);
  });

  it('seeks playback when an in-range hover event is received', () => {
    const { eventBus, subscribers } = createEventBus();
    const playback = createPlayback();

    renderBridge(eventBus, playback);

    const hoverSubscriber = subscribers.find((subscriber) => subscriber.eventType === DataHoverEvent);
    expect(hoverSubscriber).toBeDefined();

    act(() => {
      hoverSubscriber?.handler(new DataHoverEvent({ point: { time: 1500 } }));
    });
    expect(playback.seekTo).toHaveBeenCalledWith(1500);

    act(() => {
      hoverSubscriber?.handler(new DataHoverEvent({ point: { time: 2500 } }));
    });
    expect(playback.seekTo).toHaveBeenCalledTimes(1);
  });

  it('updates selectedKey from incoming hover payload data', () => {
    const { eventBus, subscribers } = createEventBus();
    const { result } = renderBridge(eventBus, createPlayback());

    const hoverSubscriber = subscribers.find((subscriber) => subscriber.eventType === DataHoverEvent);
    expect(hoverSubscriber).toBeDefined();

    act(() => {
      hoverSubscriber?.handler(new DataHoverEvent({ data: { name: 'sensor-2' } } as any));
    });

    expect(result.current.selectedKey).toBe('sensor-2');
  });

  it('ignores incoming selection payloads when subscribeSelection is disabled', () => {
    const { eventBus, subscribers } = createEventBus();
    const { result } = renderBridge(eventBus, createPlayback(), { subscribeSelection: false });

    const hoverSubscriber = subscribers.find((subscriber) => subscriber.eventType === DataHoverEvent);
    expect(hoverSubscriber).toBeDefined();

    act(() => {
      hoverSubscriber?.handler(new DataHoverEvent({ data: { name: 'sensor-2' } } as any));
    });

    expect(result.current.selectedKey).toBeNull();
  });

  it('updates selectedKey from incoming DataSelectEvent', () => {
    const { eventBus, subscribers } = createEventBus();
    const { result } = renderBridge(eventBus, createPlayback());

    const selectSubscriber = subscribers.find((subscriber) => subscriber.eventType === DataSelectEvent);
    expect(selectSubscriber).toBeDefined();

    act(() => {
      selectSubscriber?.handler(new DataSelectEvent({ data: { name: 'sensor-3' } } as any));
    });

    expect(result.current.selectedKey).toBe('sensor-3');
  });

  it('publishes hover events while playing and suppresses immediate echo', () => {
    jest.spyOn(Date, 'now').mockReturnValue(1000);

    const { eventBus, subscribers, published } = createEventBus();
    const playback = createPlayback({ playing: true, cursorTimeMs: 1666 });
    renderBridge(eventBus, playback);

    act(() => {
      jest.advanceTimersByTime(100);
    });
    expect(eventBus.publish).toHaveBeenCalledTimes(1);
    expect(published[0]).toBeInstanceOf(DataHoverEvent);

    const hoverSubscriber = subscribers.find((subscriber) => subscriber.eventType === DataHoverEvent);
    act(() => {
      hoverSubscriber?.handler(new DataHoverEvent({ point: { time: 1700 } }));
    });

    act(() => {
      jest.spyOn(Date, 'now').mockReturnValue(1200);
      jest.advanceTimersByTime(100);
    });
    expect(eventBus.publish).toHaveBeenCalledTimes(1);

    act(() => {
      jest.spyOn(Date, 'now').mockReturnValue(2000);
      jest.advanceTimersByTime(100);
    });
    expect(eventBus.publish).toHaveBeenCalledTimes(2);
  });
});
