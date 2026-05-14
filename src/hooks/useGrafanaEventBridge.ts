import { useCallback, useEffect, useRef, useState } from 'react';
import { type EventBus, DataHoverEvent, DataHoverClearEvent, DataSelectEvent, BusEvent, BusEventType, InterpolateFunction } from '@grafana/data';
import type { UsePlaybackResult } from './usePlayback';
import { useLatestRef } from './util/useLatestRef';
import { locationService } from '@grafana/runtime';//RefreshEvent
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
 *   - While playing, publishes DataHoverEvent at ~10Hz (point.time only, no data frame).
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
  fromTimeMs,
  toTimeMs,
  publish = true,
  subscribe = true,
  selectionVariableName,
}: {
  eventBus: EventBus | undefined;
  replaceVariables: InterpolateFunction;
  playback: UsePlaybackResult;
  fromTimeMs: number;
  toTimeMs: number;
  selectionVariableName?: string;

  publish?: boolean;
  subscribe?: boolean;
}): UseGrafanaEventBridgeResult {
  const playbackRef = useLatestRef(playback);
  const rangeRef = useLatestRef({ fromTimeMs, toTimeMs });
  const lastReceivedAtRef = useRef<number>(0);

  const selectVarValue = selectionVariableName ? replaceVariables(`$${selectionVariableName}`) : null;
  const [selectedKey_, setSelectedKey_] = useState<string | null>(null);
  const selectedKey = selectionVariableName ? selectVarValue : selectedKey_;
  
  const setSelectedKey = useCallback((key: string | null) => {
    setSelectedKey_(key);
    if (selectionVariableName) {
      const selectionVariableParam = `var-${selectionVariableName?.trim().replace(/^var-/, '') ?? ''}`;
      locationService.partial({ [selectionVariableParam]: key }, true);
    }
  }, [selectionVariableName]);

  // Publish cursor position while playing

  useInterval(() => {
    const pb = playbackRef.current;
    if (!pb.playing || !eventBus) { return; }
    if (Date.now() - lastReceivedAtRef.current < ECHO_COOLDOWN_MS) { return; }
    // Publish point.time only — no data frame, so subscribers won't misread it as a selection.
    eventBus.publish(new DataHoverEvent({ point: { time: pb.cursorTimeMs } }));
  }, eventBus && publish ? PUBLISH_INTERVAL_MS : undefined);

  useEventBridgeSubscription(
    eventBus, DataHoverEvent,
    !subscribe ? undefined :
    (event) => {
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
      if (incomingSelectionKey !== null) {
        setSelectedKey(incomingSelectionKey);
      }
    },
  )
  useEventBridgeSubscription(
    eventBus, DataHoverClearEvent,
    () => setSelectedKey(null),
  );

  useEventBridgeSubscription(
    eventBus, DataSelectEvent,
    (event) => setSelectedKey(getSelectedKeyFromEventPayload(event.payload)),
  );

  // const [refreshTime, setRefreshTime] = useState<number>(0);
  // useEventBridgeSubscription(
  //   eventBus, RefreshEvent,
  //   () => setRefreshTime(Date.now()),
  // );

  return { selectedKey, setSelectedKey };
}


const useEventBridgeSubscription = <T extends BusEvent>(eventBus: EventBus | undefined, event: BusEventType<T>, fn?: (event: T) => void) => {
  const fnRef = useLatestRef(fn);
  const enabled = Boolean(eventBus && event && fn);
  useEffect(() => {
    if (!enabled) { return; }
    const subscription = eventBus?.subscribe(event, (event: T) => fnRef.current?.(event));
    return () => subscription?.unsubscribe();
  }, [eventBus, event, fnRef, enabled]);
};
