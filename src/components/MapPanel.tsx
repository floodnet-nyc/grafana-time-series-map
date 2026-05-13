import React, { useCallback, useRef, useState } from 'react';
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

const CONTROLS_HEIGHT = 48;

export function MapPanel({ data, options, onOptionsChange, width, height, eventBus }: PanelProps<MapPanelOptions>) {
  const fromTimeMs = data.timeRange.from.valueOf();
  const toTimeMs = data.timeRange.to.valueOf();

  const playback = usePlayback({
    fromTimeMs,
    toTimeMs,
    defaultPlaybackSpeed: options.defaultPlaybackSpeed,
    loop: options.loopPlayback,
  });

  const { selectedKey, selectKey } = useGrafanaEventBridge(
    eventBus,
    playback,
    fromTimeMs,
    toTimeMs,
    options.syncPublish ?? true,
    options.syncSubscribe ?? true,
  );

  // Track the last clicked feature so the popup can show its properties.
  // External DataSelectEvent (from time series panel) sets selectedKey without a feature.
  const [selectedFeature, setSelectedFeature] = useState<Feature | null>(null);

  const onFeatureClick = useCallback(
    (feature: Feature, info: any) => {
      // const layerConfig = options.layers.find((l) => l.id === info?.layer?.id);
      const layerConfig = info.layer.props.config;
      const keyField = layerConfig?.selectionKeyField;
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

  const onToggleLayerVisibility = useCallback((layerId: string) => {
    const idx = options.layers.findIndex((l) => l.id === layerId);
    if (idx === -1) { return; }
    const layers = [...options.layers];
    layers[idx] = { ...layers[idx], visible: !layers[idx].visible };
    onOptionsChange({ ...options, layers });
  }, [options, onOptionsChange]);

  const handlePopupClose = useCallback(() => {
    selectKey(null);
    setSelectedFeature(null);
  }, [selectKey]);

  // ── Viewport tracking ───────────────────────────────────────────────────────
  const currentViewportRef = useRef<ViewportSnapshot | null>(null);

  const handleViewportChange = useCallback((viewport: ViewportSnapshot) => {
    currentViewportRef.current = viewport;
  }, []);

  // const handleSaveView = useCallback(() => {
  //   const vp = currentViewportRef.current;
  //   if (!vp) return;
  //   onOptionsChange({
  //     ...options,
  //     initialViewMode: 'manual',
  //     initialLatitude: Math.round(vp.latitude * 1e6) / 1e6,
  //     initialLongitude: Math.round(vp.longitude * 1e6) / 1e6,
  //     initialZoom: Math.round(vp.zoom * 100) / 100,
  //     initialBearing: Math.round(vp.bearing * 10) / 10,
  //     initialPitch: Math.round(vp.pitch * 10) / 10,
  //   });
  //   setViewportMoved(false);
  // }, [options, onOptionsChange]);

  const mapHeight = options.showTimeControls ? Math.max(0, height - CONTROLS_HEIGHT) : height;
  const featuresByLayerId = usePanelFeatures(data, options);
  const fitBounds = useFitBounds(options, featuresByLayerId);

  const { layers, getTooltip } = usePanelLayers(
    options,
    featuresByLayerId,
    data,
    playback.cursorTimeMs,
    fromTimeMs,
    toTimeMs,
    selectedKey,
    onFeatureClick,
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
        layers={layers}
        getTooltip={getTooltip}
        fitBounds={fitBounds}
        onViewportChange={handleViewportChange}
        interleaved={options.interleaved ?? true}
      />
      {options.showLegend && (
        <MapLegend layers={options.layers} onToggleVisibility={onToggleLayerVisibility} panelWidth={width} />
      )}
      {selectedKey && (
        <SensorPopup
          selectedKey={selectedKey}
          feature={selectedFeature}
          template={options.popupTemplate ?? DEFAULT_POPUP_TEMPLATE}
          onClose={handlePopupClose}
        />
      )}
      {options.showTimeControls && (
        <TimePlaybackControls
          width={width}
          fromTimeMs={fromTimeMs}
          toTimeMs={toTimeMs}
          playback={playback}
        />
      )}
      {/* "Set as initial view" button — saves the current viewport to options */}
      {/* {viewportMoved && (
        <button
          onClick={handleSaveView}
          title="Save current map position as the initial view"
          style={{
            position: 'absolute',
            bottom: options.showTimeControls ? CONTROLS_HEIGHT + 10 : 10,
            right: 10,
            zIndex: 200,
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            padding: '5px 10px',
            background: 'rgba(14, 16, 26, 0.88)',
            border: '1px solid rgba(255,255,255,0.18)',
            borderRadius: 6,
            color: '#ccc',
            fontSize: 11,
            fontWeight: 600,
            cursor: 'pointer',
            backdropFilter: 'blur(4px)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
            lineHeight: 1,
          }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
            <circle cx="12" cy="10" r="3"/>
          </svg>
          Set as initial view
        </button>
      )} */}
    </div>
  );
}
