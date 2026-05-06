import '../layers/_all'; // side-effect: registers all built-in layer types
import React from 'react';
import { css } from '@emotion/css';
import type { PanelProps } from '@grafana/data';
import type { MapPanelOptions } from '../types';
import { DeckGLMap } from './map/DeckGLMap';
import { TimePlaybackControls } from './controls/TimePlaybackControls';
import { usePlayback } from '../hooks/usePlayback';
import { usePanelLayers } from '../hooks/usePanelLayers';

const CONTROLS_HEIGHT = 48;

export function MapPanel({ data, options, width, height }: PanelProps<MapPanelOptions>) {
  const fromTimeMs = data.timeRange.from.valueOf();
  const toTimeMs = data.timeRange.to.valueOf();

  const playback = usePlayback({
    fromTimeMs,
    toTimeMs,
    defaultPlaybackSpeed: options.defaultPlaybackSpeed,
    loop: options.loopPlayback,
  });

  const mapHeight = options.showTimeControls ? height - CONTROLS_HEIGHT : height;

  const layers = usePanelLayers(data, options, playback.cursorTimeMs, fromTimeMs, toTimeMs);

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
