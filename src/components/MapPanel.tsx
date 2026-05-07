import '../layers/_all'; // side-effect: registers all built-in layer types
import React, { useCallback, useState } from 'react';
import { css } from '@emotion/css';
import type { PanelProps } from '@grafana/data';
import type { Feature } from 'geojson';
import type { MapPanelOptions } from '../types';
import { DeckGLMap } from './map/DeckGLMap';
import { TimePlaybackControls } from './controls/TimePlaybackControls';
import { SensorPopup } from './SensorPopup';
import { usePlayback } from '../hooks/usePlayback';
import { usePanelLayers } from '../hooks/usePanelLayers';
import { useGrafanaEventBridge } from '../hooks/useGrafanaEventBridge';

const CONTROLS_HEIGHT = 48;

export function MapPanel({ data, options, width, height, eventBus }: PanelProps<MapPanelOptions>) {
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

  const handlePopupClose = useCallback(() => {
    selectKey(null);
    setSelectedFeature(null);
  }, [selectKey]);

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
      <DeckGLMap width={width} height={mapHeight} options={options} layers={layers} />
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
    </div>
  );
}
