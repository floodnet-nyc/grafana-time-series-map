import React, { useCallback, useMemo, useState } from 'react';
import { css } from '@emotion/css';
import { FieldType, type DataFrame, type DataHoverPayload, type PanelProps, type RawTimeRange } from '@grafana/data';
import type { Feature } from 'geojson';
import type { MapPanelOptions } from '../types';
import { DeckGLMap } from './map/DeckGLMap';
import type { ViewportSnapshot } from './map/types';
import { TimePlaybackControls } from './controls/TimePlaybackControls';
import { SensorPopup, DEFAULT_POPUP_TEMPLATE } from './SensorPopup';
import { MapLegend } from './map-legend/MapLegend';
import { usePlayback } from '../hooks/usePlayback';
import { usePanelFeatures, usePanelLayers } from '../hooks/usePanelLayers';
import { useFitBounds } from '../hooks/useFitBounds';
import { useGrafanaEventBridge } from '../hooks/useGrafanaEventBridge';
import { setCurrentViewportSnapshot } from '../editor/currentViewportStore';
import { parseMapHashView, useWriteMapHashView } from 'hooks/useMapHashRoute';
import {
  buildCurrentLocationLayers,
  type CurrentLocationState,
} from '../layers/current-location/currentLocationLayers';
import type { FeaturePickingInfo } from '../layers/types';
import { buildFeatureAt, getRowValue } from '../utils/dataframe/layerTable';
import 'style.css';

const CONTROLS_HEIGHT = 48;

type SeriesHoverInfo = {
  data: DataFrame;
  rowIndex: number;
  value: number;
};

function isLiveTimeRange(raw: RawTimeRange): boolean {
  return typeof raw.to === 'string' && raw.to.includes('now');
}

function getNearestSeriesHoverInfo(frame: DataFrame, targetTimeMs: number): SeriesHoverInfo | null {
  const timeField = frame.fields.find((field) => field.type === FieldType.time);
  const valueField = frame.fields.find((field) => field.type === FieldType.number);
  if (!timeField || !valueField || frame.length === 0) {
    return null;
  }

  let bestIndex = -1;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (let index = 0; index < frame.length; index += 1) {
    const timeValue = Number(timeField.values[index]);
    const value = Number(valueField.values[index]);
    if (!Number.isFinite(timeValue) || !Number.isFinite(value)) {
      continue;
    }
    const distance = Math.abs(timeValue - targetTimeMs);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestIndex = index;
    }
  }

  if (bestIndex === -1) {
    return null;
  }

  const value = Number(valueField.values[bestIndex]);
  if (!Number.isFinite(value)) {
    return null;
  }

  return {
    data: frame,
    rowIndex: bestIndex,
    value,
  };
}

function buildHoverPayload(
  series: DataFrame[],
  selectedKey: string | null,
  cursorTimeMs: number
): DataHoverPayload | null {
  const matchingFrame = selectedKey ? series.find((frame) => frame.name === selectedKey) : undefined;
  const selectedInfo = matchingFrame ? getNearestSeriesHoverInfo(matchingFrame, cursorTimeMs) : null;
  const fallbackInfo = series.reduce<SeriesHoverInfo | null>((best, frame) => {
    const candidate = getNearestSeriesHoverInfo(frame, cursorTimeMs);
    if (!candidate) {
      return best;
    }
    return !best || candidate.value > best.value ? candidate : best;
  }, null);
  const hoverInfo = selectedInfo ?? fallbackInfo;
  if (!hoverInfo) {
    return null;
  }

  return {
    data: hoverInfo.data,
    rowIndex: hoverInfo.rowIndex,
    dataId: hoverInfo.data.name,
    point: {
      time: cursorTimeMs,
      y: hoverInfo.value,
    },
  };
}

function useMapViewState(options: MapPanelOptions) {
  const hashRoutingEnabled = options.basemap.interactions?.syncViewToUrl ?? false;
  const hashInitialView = useMemo(
    () => (hashRoutingEnabled ? (parseMapHashView() ?? undefined) : undefined),
    [hashRoutingEnabled]
  );
  const { latitude, longitude, zoom, bearing, pitch } = options.initialView.state;
  const manualViewState: ViewportSnapshot = { latitude, longitude, zoom, bearing: bearing ?? 0, pitch: pitch ?? 0 };
  const initialViewState: ViewportSnapshot = hashInitialView ?? manualViewState;
  const writeHashView = useWriteMapHashView(hashRoutingEnabled);
  return { initialViewState, initialViewFromHash: Boolean(hashInitialView), writeHashView };
}

export function MapPanel({
  data,
  options,
  onOptionsChange,
  width,
  height,
  eventBus,
  replaceVariables,
}: PanelProps<MapPanelOptions>) {
  const fromTimeMs = data.timeRange.from.valueOf();
  const toTimeMs = data.timeRange.to.valueOf();
  const live = isLiveTimeRange(data.timeRange.raw);

  const playback = usePlayback({
    fromTimeMs,
    toTimeMs,
    defaultPlaybackSpeed: options.time.defaultSpeed,
    loop: options.time.loop,
    live,
  });

  const getHoverPayload = useCallback(
    (key: string | null, cursorTimeMs: number) => buildHoverPayload(data.series as DataFrame[], key, cursorTimeMs),
    [data.series]
  );

  const { selectedKey, setSelectedKey: selectKey } = useGrafanaEventBridge({
    eventBus,
    replaceVariables,
    playback,
    getHoverPayload,
    fromTimeMs,
    toTimeMs,
    publish: options.sync.publish,
    subscribe: options.sync.subscribe,
    publishSelection: options.sync.publishSelection,
    subscribeSelection: options.sync.subscribeSelection,
    selectionVariableName: options.sync.selectionVariableName,
  });

  // Track the last clicked feature so the popup can show its properties.
  // External DataSelectEvent (from time series panel) sets selectedKey without a feature.
  const [selectedFeature, setSelectedFeature] = useState<Feature | null>(null);
  const [currentLocation, setCurrentLocation] = useState<CurrentLocationState | null>(null);

  const onFeatureClick = useCallback(
    (feature: Feature, info: FeaturePickingInfo) => {
      const keyField = info.layer?.props.config?.selectionKey;
      const featureSourceId = info.layer?.props.config?.data?.featureSource?.id;
      if (!keyField?.field || keyField.source !== featureSourceId) {
        return;
      }
      const key = String(feature.properties?.[keyField.field] ?? '');
      if (!key) {
        return;
      }
      if (key === selectedKey) {
        selectKey(null);
        setSelectedFeature(null);
      } else {
        selectKey(key);
        setSelectedFeature(feature);
      }
    },
    [selectedKey, selectKey]
  );

  const handlePopupClose = useCallback(() => {
    selectKey(null);
    setSelectedFeature(null);
  }, [selectKey]);

  const onToggleLayerVisibility = useCallback(
    (layerId: string) => {
      const idx = options.layers.findIndex((l) => l.id === layerId);
      if (idx === -1) {
        return;
      }
      const layers = [...options.layers];
      layers[idx] = { ...layers[idx], visible: !layers[idx].visible };
      onOptionsChange({ ...options, layers });
    },
    [options, onOptionsChange]
  );

  // ── Viewport tracking ───────────────────────────────────────────────────────
  const { initialViewState, initialViewFromHash, writeHashView } = useMapViewState(options);

  const handleViewportChange = useCallback(
    (viewport: ViewportSnapshot) => {
      setCurrentViewportSnapshot(viewport);
      writeHashView(viewport);
    },
    [writeHashView]
  );

  const mapHeight = options.time.show ? Math.max(0, height - CONTROLS_HEIGHT) : height;
  const featuresByLayerId = usePanelFeatures(data, options);
  const resolvedSelectedFeature = useMemo(() => {
    if (!selectedKey) {
      return null;
    }

    if (
      selectedFeature &&
      options.layers.some((layer) => {
        const keyField = layer.selectionKey;
        return keyField?.field && keyField.source === layer.data.featureSource.id
          ? String(selectedFeature.properties?.[keyField.field] ?? '') === selectedKey
          : false;
      })
    ) {
      return selectedFeature;
    }

    for (const layer of options.layers) {
      const keyField = layer.selectionKey;
      if (!keyField?.field || keyField.source !== layer.data.featureSource.id) {
        continue;
      }

      const table = featuresByLayerId.get(layer.id);
      if (!table) {
        continue;
      }
      for (let index = 0; index < table.data.length; index += 1) {
        if (String(getRowValue(table, index, keyField.field) ?? '') === selectedKey) {
          return buildFeatureAt(table, index);
        }
      }
    }

    return null;
  }, [featuresByLayerId, options.layers, selectedFeature, selectedKey]);

  const { layers, preparedLayerStates } = usePanelLayers(
    options,
    featuresByLayerId,
    data,
    playback.cursorTimeMs,
    fromTimeMs,
    toTimeMs,
    playback.playing,
    playback.playbackSpeed,
    selectedKey,
    onFeatureClick
  );
  const fitBounds = useFitBounds(options, preparedLayerStates);
  const fitRequestId = options.initialView.fitRequestId ?? 0;
  const currentLocationLayers = useMemo(() => buildCurrentLocationLayers(currentLocation), [currentLocation]);
  const deckLayers = useMemo(() => [...layers, ...currentLocationLayers], [layers, currentLocationLayers]);

  // Widget callbacks sourced from panel-level state (viewport callbacks are added by each provider).
  const widgetCallbacks = useMemo(
    () => ({
      provider: options.basemap.provider,
      geolocate: {
        onLocation: ({ latitude, longitude, accuracy }: CurrentLocationState & { zoom: number }) =>
          setCurrentLocation({ latitude, longitude, accuracy }),
      },
      playback: {
        cursorTimeMs: playback.cursorTimeMs,
        timeRange: [fromTimeMs, toTimeMs] as [number, number],
        playing: playback.playing,
        playInterval: playback.playbackSpeed,
        onPlayingChange: (v: boolean) => (v ? playback.play() : playback.pause()),
        onSeekTo: (t: number) => playback.seekTo(t, false),
        formatLabel: (timeMs: number) => new Date(timeMs).toLocaleString(),
      },
      selection: {
        key: selectedKey,
        feature: resolvedSelectedFeature,
      },
    }),
    [playback, fromTimeMs, options.basemap.provider, resolvedSelectedFeature, selectedKey, toTimeMs]
  );

  return (
    <div
      className={css({
        position: 'relative',
        width,
        height,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      })}
    >
      <DeckGLMap
        width={width}
        height={mapHeight}
        options={options}
        layers={deckLayers}
        widgetCallbacks={widgetCallbacks}
        initialViewState={initialViewState}
        initialViewFromHash={initialViewFromHash}
        fitBounds={fitBounds}
        fitRequestId={fitRequestId}
        onViewportChange={handleViewportChange}
      />
      {options.legend.show && (
        <MapLegend
          layers={options.layers}
          onToggleVisibility={onToggleLayerVisibility}
          panelWidth={width}
          maxWidth={options.legend.maxWidth}
          maxHeight={options.legend.maxHeight}
        />
      )}
      {selectedKey && (
        <SensorPopup
          selectedKey={selectedKey}
          feature={resolvedSelectedFeature}
          template={options.popup.template ?? DEFAULT_POPUP_TEMPLATE}
          onClose={handlePopupClose}
        />
      )}
      {options.time.show && (
        <TimePlaybackControls width={width} fromTimeMs={fromTimeMs} toTimeMs={toTimeMs} playback={playback} />
      )}
    </div>
  );
}
