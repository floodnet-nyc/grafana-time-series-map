import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  type EventBus,
  DataHoverEvent,
  DataHoverClearEvent,
  DataSelectEvent,
  BusEvent,
  BusEventType,
  type DataHoverPayload,
  InterpolateFunction,
} from '@grafana/data';
import type { UsePlaybackResult } from './usePlayback';
import { useLatestRef } from './util/useLatestRef';
import { locationService, RefreshEvent } from '@grafana/runtime'; //RefreshEvent
import { useInterval } from './util/useInterval';
// import useDebouncedCallback from './util/useDebouncedCallback';

const PUBLISH_INTERVAL_MS = 100;
const ECHO_COOLDOWN_MS = 500;

export interface UseGrafanaEventBridgeResult {
  selectedKey: string | null;
  setSelectedKey: (key: string | null) => void;
  // refreshTime: number;
}

function getSelectedKeyFromEventPayload(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const candidate = payload as {
    data?: { name?: unknown };
    dataId?: unknown;
  };

  const key = candidate.data?.name ?? candidate.dataId;
  return typeof key === 'string' && key.length > 0 ? key : null;
}

/**
 * Syncs this panel's playback cursor and series selection with other Grafana panels.
 *
 * Cursor sync:
 *   - While playing or scrubbing, publishes DataHoverEvent at ~10Hz (point.time only, no data frame).
 *   - Subscribes to DataHoverEvent and seeks our cursor to match.
 *
 * Selection sync:
 *   - DataHoverEvent.payload.data carries the hovered DataFrame; after partitionByValues
 *     each frame's name equals the deployment_id. We use that for highlighting.
 *   - DataHoverClearEvent clears the selection.
 *   - Map marker clicks call selectKey locally (no back-publish — the time series panel
 *     doesn't support being driven externally by DataSelectEvent in a useful way).
 */
export function useGrafanaEventBridge({
  eventBus,
  replaceVariables,
  playback,
  getHoverPayload,
  fromTimeMs,
  toTimeMs,
  publish = true,
  subscribe = true,
  publishSelection = true,
  subscribeSelection = true,
  selectionVariableName,
}: {
  eventBus: EventBus | undefined;
  replaceVariables: InterpolateFunction;
  playback: UsePlaybackResult;
  getHoverPayload?: (selectedKey: string | null, cursorTimeMs: number) => DataHoverPayload | null;
  fromTimeMs: number;
  toTimeMs: number;
  selectionVariableName?: string;

  publish?: boolean;
  subscribe?: boolean;
  publishSelection?: boolean;
  subscribeSelection?: boolean;
}): UseGrafanaEventBridgeResult {
  const playbackRef = useLatestRef(playback);
  const getHoverPayloadRef = useLatestRef(getHoverPayload);
  const rangeRef = useLatestRef({ fromTimeMs, toTimeMs });
  const lastReceivedAtRef = useRef<number>(0);

  const [refreshTime, setRefreshTime] = useState<number>(0);
  useEventBridgeSubscription(eventBus, RefreshEvent, () => setRefreshTime(Date.now()));

  const selectVarValue = useMemo(
    () => (selectionVariableName && (refreshTime || true) ? replaceVariables(`$${selectionVariableName}`) : null),
    [replaceVariables, selectionVariableName, refreshTime]
  );
  const [selectedKey_, setSelectedKey_] = useState<string | null>(null);
  const selectedKey = selectionVariableName ? selectVarValue : selectedKey_;

  const applySelectedKey = useCallback(
    (key: string | null, origin: 'local' | 'external') => {
      if (selectionVariableName) {
        const selectionVariableParam = `var-${selectionVariableName?.trim().replace(/^var-/, '') ?? ''}`;
        locationService.partial({ [selectionVariableParam]: key ?? '' }, true);
      } else {
        setSelectedKey_(key);
      }

      if (origin === 'local' && publishSelection && eventBus) {
        if (key) {
          eventBus.publish(new DataSelectEvent({ data: { name: key } } as any));
        } else {
          eventBus.publish(new DataHoverClearEvent());
        }
      }
    },
    [selectionVariableName, publishSelection, eventBus]
  );

  const setSelectedKey = useCallback((key: string | null) => applySelectedKey(key, 'local'), [applySelectedKey]);

  // Publish cursor position while playing or scrubbing

  useInterval(
    () => {
      const pb = playbackRef.current;
      if ((!pb.playing && !pb.scrubbing) || !eventBus) {
        return;
      }
      if (Date.now() - lastReceivedAtRef.current < ECHO_COOLDOWN_MS) {
        return;
      }
      eventBus.publish(
        new DataHoverEvent(getHoverPayloadRef.current?.(selectedKey, pb.cursorTimeMs) ?? { point: { time: pb.cursorTimeMs } })
      );
    },
    eventBus && publish ? PUBLISH_INTERVAL_MS : undefined
  );

  useEventBridgeSubscription(
    eventBus,
    DataHoverEvent,
    !subscribe
      ? undefined
      : (event) => {
          if (playbackRef.current.playing || playbackRef.current.scrubbing) {
            return;
          }

          const { point } = event.payload ?? {};

          // Cursor sync: always seek if point.time is in range
          const timeMs = point?.time;
          if (typeof timeMs === 'number') {
            const { fromTimeMs: f, toTimeMs: t } = rangeRef.current;
            if (timeMs >= f && timeMs <= t) {
              lastReceivedAtRef.current = Date.now();
              playbackRef.current.seekTo(timeMs);
            }
          }

          const incomingSelectionKey = getSelectedKeyFromEventPayload(event.payload);
          if (subscribeSelection && incomingSelectionKey !== null) {
            applySelectedKey(incomingSelectionKey, 'external');
          }
        }
  );
  useEventBridgeSubscription(
    eventBus,
    DataHoverClearEvent,
    subscribeSelection ? () => applySelectedKey(null, 'external') : undefined
  );

  useEventBridgeSubscription(
    eventBus,
    DataSelectEvent,
    subscribeSelection ? (event) => applySelectedKey(getSelectedKeyFromEventPayload(event.payload), 'external') : undefined
  );

  return { selectedKey, setSelectedKey };
}

const useEventBridgeSubscription = <T extends BusEvent>(
  eventBus: EventBus | undefined,
  event: BusEventType<T>,
  fn?: (event: T) => void
) => {
  const fnRef = useLatestRef(fn);
  const enabled = Boolean(eventBus && event && fn);
  useEffect(() => {
    if (!enabled) {
      return;
    }
    const subscription = eventBus?.subscribe(event, (event: T) => fnRef.current?.(event));
    return () => subscription?.unsubscribe();
  }, [eventBus, event, fnRef, enabled]);
};
