import '../layers/_all'; // side-effect: registers all built-in layer types
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { css } from '@emotion/css';
import type { PanelProps } from '@grafana/data';
import type { Feature, Geometry } from 'geojson';
import type { MapPanelOptions } from '../types';
import { DeckGLMap } from './map/DeckGLMap';
import type { ViewportSnapshot } from './map/MaplibreMap';
import { TimePlaybackControls } from './controls/TimePlaybackControls';
import { SensorPopup } from './SensorPopup';
import { MapLegend } from './MapLegend';
import { usePlayback } from '../hooks/usePlayback';
import { usePanelLayers } from '../hooks/usePanelLayers';
import { useGrafanaEventBridge } from '../hooks/useGrafanaEventBridge';
import { dataFramesToFeatures } from '../utils/dataframe/toGeoJsonFeatures';

const CONTROLS_HEIGHT = 48;

// Recursively collect [lng, lat] coordinate pairs from any GeoJSON geometry.
function collectCoords(geom: Geometry | null | undefined): Array<[number, number]> {
  if (!geom) {
    return [];
  }
  switch (geom.type) {
    case 'Point': return [geom.coordinates as [number, number]];
    case 'MultiPoint':
    case 'LineString': return geom.coordinates as Array<[number, number]>;
    case 'MultiLineString':
    case 'Polygon': return (geom.coordinates as Array<Array<[number, number]>>).flat();
    case 'MultiPolygon': return (geom.coordinates as Array<Array<Array<[number, number]>>>).flat(2);
    case 'GeometryCollection': return geom.geometries.flatMap((g) => collectCoords(g));
    default: return [];
  }
}

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
    (feature: Feature, _info: any) => {
      const key = String(feature.properties?.deployment_id ?? '');
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
    onOptionsChange({
      ...options,
      layers: options.layers.map((l) => l.id === layerId ? { ...l, visible: !l.visible } : l),
    });
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

  // ── Fit-to-data bounds ──────────────────────────────────────────────────────
  const fitBounds = useMemo((): [[number, number], [number, number]] | undefined => {
    if (options.initialViewMode !== 'fitData') {
      return undefined;
    }
    let minLng = Infinity, maxLng = -Infinity, minLat = Infinity, maxLat = -Infinity;
    for (const layerConfig of options.layers) {
      if (layerConfig.geometry.type === 'none') {
        continue;
      }
      const features = dataFramesToFeatures(
        data.series,
        layerConfig.queryRefId,
        layerConfig.geometry,
        undefined,
        [],
      );
      for (const f of features) {
        for (const [lng, lat] of collectCoords(f.geometry)) {
          if (!isFinite(lng) || !isFinite(lat)) {
            continue;
          }
          minLng = Math.min(minLng, lng); maxLng = Math.max(maxLng, lng);
          minLat = Math.min(minLat, lat); maxLat = Math.max(maxLat, lat);
        }
      }
    }
    if (!isFinite(minLng) || minLng === maxLng) {
      return undefined;
    }
    return [[minLng, minLat], [maxLng, maxLat]];
  }, [data.series, options.layers, options.initialViewMode]);

  const mapHeight = options.showTimeControls ? height - CONTROLS_HEIGHT : height;

  const layers = usePanelLayers(
    data,
    options,
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
