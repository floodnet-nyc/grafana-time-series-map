import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { css } from '@emotion/css';
import type { PanelProps } from '@grafana/data';
import type { Feature } from 'geojson';
import type { MapPanelOptions } from '../types';
import { DeckGLMap } from './map/DeckGLMap';
import type { ViewportSnapshot } from './map/types';
import { TimePlaybackControls } from './controls/TimePlaybackControls';
import { SensorPopup, DEFAULT_POPUP_TEMPLATE } from './SensorPopup';
import { MapLegend } from './MapLegend';
import { usePlayback } from '../hooks/usePlayback';
import { usePanelFeatures, usePanelLayers } from '../hooks/usePanelLayers';
import { useFitBounds } from '../hooks/useFitBounds';
import { useGrafanaEventBridge } from '../hooks/useGrafanaEventBridge';
import { getFitToDataRequestId, setCurrentViewportSnapshot, subscribeFitToDataRequests } from '../editor/currentViewportStore';
import { parseMapHashView, useWriteMapHashView } from 'hooks/useMapHashRoute';

const CONTROLS_HEIGHT = 48;


export const useMapViewState = (options: MapPanelOptions) => {
  const initialViewMode = options.initialView.mode;
  const hashRoutingEnabled = options.basemap.interactions?.syncViewToUrl ?? false;

  const hashInitialView = useMemo(() => hashRoutingEnabled ? parseMapHashView() ?? undefined : undefined, [hashRoutingEnabled]);
  const manualInitialView = initialViewMode === 'manual' ? options.initialView.state : undefined;
  const initialViewState = hashInitialView ?? manualInitialView;

  const writeHashView = useWriteMapHashView(hashRoutingEnabled);

  return { initialViewState, writeHashView };
}


export function MapPanel({ data, options, onOptionsChange, width, height, eventBus, replaceVariables }: PanelProps<MapPanelOptions>) {
  const fromTimeMs = data.timeRange.from.valueOf();
  const toTimeMs = data.timeRange.to.valueOf();

  const playback = usePlayback({
    fromTimeMs,
    toTimeMs,
    defaultPlaybackSpeed: options.time.defaultSpeed,
    loop: options.time.loop,
  });

  const { selectedKey, setSelectedKey: selectKey } = useGrafanaEventBridge({
    eventBus,
    replaceVariables,
    playback,
    fromTimeMs,
    toTimeMs,
    publish: options.sync.publish,
    subscribe: options.sync.subscribe,
    selectionVariableName: options.sync.selectionVariableName,
  });

  // Track the last clicked feature so the popup can show its properties.
  // External DataSelectEvent (from time series panel) sets selectedKey without a feature.
  const [selectedFeature, setSelectedFeature] = useState<Feature | null>(null);

  // TODO
  const popupFeature =
    selectedFeature && selectedKey
      ? options.layers.some((layer) => {
          const keyField = layer.selectionKeyField;
          return keyField ? String(selectedFeature.properties?.[keyField] ?? '') === selectedKey : false;
        })
        ? selectedFeature
        : null
      : null;

  const onFeatureClick = useCallback(
    (feature: Feature, info: any) => {
      const keyField = info.layer.props.config?.selectionKeyField;
      if (!keyField) { return; }
      const key = String(feature.properties?.[keyField] ?? '');
      if (!key) { return; }
      // Toggle off if already selected
      if (key === selectedKey) {
        selectKey(null);
        setSelectedFeature(null);
      } else {
        selectKey(key);
        setSelectedFeature(feature);
      }
    },
    [selectedKey, selectKey],
  );

  const handlePopupClose = useCallback(() => {
    selectKey(null);
    setSelectedFeature(null);
  }, [selectKey]);

  const onToggleLayerVisibility = useCallback((layerId: string) => {
    const idx = options.layers.findIndex((l) => l.id === layerId);
    if (idx === -1) { return; }
    const layers = [...options.layers];
    layers[idx] = { ...layers[idx], visible: !layers[idx].visible };
    onOptionsChange({ ...options, layers });
  }, [options, onOptionsChange]);

  // ── Viewport tracking ───────────────────────────────────────────────────────
  // const { initialViewState, writeHashView } = useMapViewState(options);

  const currentViewportRef = useRef<ViewportSnapshot | null>(null);
  const pendingFitCaptureRef = useRef<number | null>(null);
  const [fitRequestId, setFitRequestId] = useState(0);

  const handleViewportChange = useCallback((viewport: ViewportSnapshot) => {
    currentViewportRef.current = viewport;
    setCurrentViewportSnapshot(viewport);
    // writeHashView(viewport);
    if (pendingFitCaptureRef.current !== null) {
      pendingFitCaptureRef.current = null;
      onOptionsChange({
        ...options,
        initialView: {
          ...options.initialView,
          state: {
            latitude: Math.round(viewport.latitude * 1e6) / 1e6,
            longitude: Math.round(viewport.longitude * 1e6) / 1e6,
            zoom: Math.round(viewport.zoom * 100) / 100,
            bearing: Math.round((viewport.bearing ?? 0) * 10) / 10,
            pitch: Math.round((viewport.pitch ?? 0) * 10) / 10,
          },
        },
      });
    }
  }, [onOptionsChange, options]);

  // const handleSaveView = useCallback(() => {
  //   const vp = currentViewportRef.current;
  //   if (!vp) return;
  //   onOptionsChange({
  //     ...options,
  //     initialView: {
  //       mode: 'manual',
  //       state: {
  //         latitude: Math.round(vp.latitude * 1e6) / 1e6,
  //         longitude: Math.round(vp.longitude * 1e6) / 1e6,
  //         zoom: Math.round(vp.zoom * 100) / 100,
  //         bearing: Math.round(vp.bearing * 10) / 10,
  //         pitch: Math.round(vp.pitch * 10) / 10,
  //       },
  //     },
  //   });
  //   setViewportMoved(false);
  // }, [options, onOptionsChange]);

  const mapHeight = options.time.show ? Math.max(0, height - CONTROLS_HEIGHT) : height;
  const featuresByLayerId = usePanelFeatures(data, options);

  const { layers, getTooltip, preparedLayerStates } = usePanelLayers(
    options,
    featuresByLayerId,
    data,
    playback.cursorTimeMs,
    fromTimeMs,
    toTimeMs,
    selectedKey,
    onFeatureClick,
  );
  const fitBounds = useFitBounds(options, preparedLayerStates);

  useEffect(() => {
    return subscribeFitToDataRequests(() => {
      if (options.initialView.mode !== 'fitData' || !fitBounds) {
        return;
      }
      const requestId = getFitToDataRequestId();
      pendingFitCaptureRef.current = requestId;
      setFitRequestId(requestId);
    });
  }, [fitBounds, options.initialView.mode]);

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
        layers={layers}
        getTooltip={getTooltip}
        // initialViewState={initialViewState}
        fitBounds={fitBounds}
        fitRequestId={fitRequestId}
        onViewportChange={handleViewportChange}
        interleaved={options.deck.interleaved}
      />
      {options.legend.show && (
        <MapLegend layers={options.layers} onToggleVisibility={onToggleLayerVisibility} panelWidth={width} />
      )}
      {selectedKey && (
        <SensorPopup
          selectedKey={selectedKey}
          feature={popupFeature}
          template={options.popup.template ?? DEFAULT_POPUP_TEMPLATE}
          onClose={handlePopupClose}
        />
      )}
      {options.time.show && (
        <TimePlaybackControls
          width={width}
          fromTimeMs={fromTimeMs}
          toTimeMs={toTimeMs}
          playback={playback}
        />
      )}
    </div>
  );
}
