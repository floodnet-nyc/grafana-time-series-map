import React from 'react';
import type { Layer } from '@deck.gl/core';
import type { MapPanelOptions } from '../../types';
import { MaplibreMap } from './MaplibreMap';
import { GoogleMap } from './GoogleMap';

interface DeckGLMapProps {
  width: number;
  height: number;
  options: MapPanelOptions;
  layers: Layer[];
}

export function DeckGLMap({ width, height, options, layers }: DeckGLMapProps) {
  if (options.basemapProvider === 'google') {
    return <GoogleMap width={width} height={height} options={options} layers={layers} />;
  }
  return <MaplibreMap width={width} height={height} options={options} layers={layers} />;
}
