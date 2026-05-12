import React from 'react';
import type { Layer } from '@deck.gl/core';
import type { MapPanelOptions } from '../../types';
import { MaplibreMap, type ViewportSnapshot } from './MaplibreMap';
import { GoogleMap } from './GoogleMap';

interface DeckGLMapProps {
  width: number;
  height: number;
  options: MapPanelOptions;
  layers: Layer[];
  fitBounds?: [[number, number], [number, number]];
  onViewportChange?: (viewport: ViewportSnapshot) => void;
  interleaved?: boolean;
}

export function DeckGLMap({ width, height, options, layers, fitBounds, onViewportChange, interleaved }: DeckGLMapProps) {
  if (options.basemapProvider === 'google') {
    return (
      <GoogleMap
        width={width}
        height={height}
        options={options}
        layers={layers}
        fitBounds={fitBounds}
        interleaved={interleaved}
        onViewportChange={onViewportChange}
      />
    );
  }
  return (
    <MaplibreMap
      width={width}
      height={height}
      options={options}
      layers={layers}
      fitBounds={fitBounds}
      onViewportChange={onViewportChange}
      interleaved={interleaved}
    />
  );
}
