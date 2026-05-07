import { useCallback, useEffect, useRef, useState } from 'react';
import type { EventBus } from '@grafana/data';
import { DataHoverEvent, DataHoverClearEvent, DataSelectEvent } from '@grafana/data';
import type { UsePlaybackResult } from './usePlayback';

const PUBLISH_INTERVAL_MS = 100;
const ECHO_COOLDOWN_MS = 500;

export interface UseGrafanaEventBridgeResult {
  selectedKey: string | null;
  selectKey: (key: string | null) => void;
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
export function useGrafanaEventBridge(
  eventBus: EventBus | undefined,
  playback: UsePlaybackResult,
  fromTimeMs: number,
  toTimeMs: number,
  publish: boolean,
  subscribe: boolean,
): UseGrafanaEventBridgeResult {
  const playbackRef = useRef(playback);
  playbackRef.current = playback;

  const rangeRef = useRef({ fromTimeMs, toTimeMs });
  rangeRef.current = { fromTimeMs, toTimeMs };

  const lastReceivedAtRef = useRef<number>(0);

  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  // Used by map marker clicks for local-only selection (no eventBus publish needed).
  const selectKey = useCallback((key: string | null) => {
    setSelectedKey(key);
  }, []);

  // Publish cursor position while playing
  useEffect(() => {
    if (!eventBus || !publish) { return; }

    const interval = setInterval(() => {
      const pb = playbackRef.current;
      if (!pb.playing) { return; }
      if (Date.now() - lastReceivedAtRef.current < ECHO_COOLDOWN_MS) { return; }

      // Publish point.time only — no data frame, so subscribers won't misread it as a selection.
      eventBus.publish(new DataHoverEvent({ point: { time: pb.cursorTimeMs } }));
    }, PUBLISH_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [eventBus, publish]);

  // Subscribe to incoming events from other panels
  useEffect(() => {
    if (!eventBus || !subscribe) { return; }

    const hoverSub = eventBus.subscribe(DataHoverEvent, (event) => {
      const { point, data, columnIndex, rowIndex } = event.payload ?? {};
      console.log('Received DataHoverEvent', columnIndex, rowIndex, data);

      // Cursor sync: always seek if point.time is in range
      const timeMs = point?.time;
      if (typeof timeMs === 'number') {
        const { fromTimeMs: f, toTimeMs: t } = rangeRef.current;
        if (timeMs >= f && timeMs <= t) {
          lastReceivedAtRef.current = Date.now();
          playbackRef.current.seekTo(timeMs);
        }
      }

      // Series selection: data frame present means a specific series is being hovered.
      // After partitionByValues, data.name is the deployment_id of the hovered series.
      if (data != null && columnIndex != null) {
        const key = data.fields[columnIndex].labels?.deployment_id ?? null;
        // const key = data.labels?.deployment_id ?? null;
        // const key = data.name ?? null;
        setSelectedKey(key ?? null);
        // Suppress echo on the cursor publish for a moment since we just received
        lastReceivedAtRef.current = Date.now();
        void columnIndex; void rowIndex; // available if needed for sub-field resolution
      }
    });

    const clearSub = eventBus.subscribe(DataHoverClearEvent, () => {
      setSelectedKey(null);
    });

    // DataSelectEvent (click) may also carry data — handle the same way as hover
    const selectSub = eventBus.subscribe(DataSelectEvent, (event) => {
      const key = event.payload?.data?.name ?? event.payload?.dataId ?? null;
      setSelectedKey(key ?? null);
    });

    return () => {
      hoverSub.unsubscribe();
      clearSub.unsubscribe();
      selectSub.unsubscribe();
    };
  }, [eventBus, subscribe]);

  return { selectedKey, selectKey };
}
