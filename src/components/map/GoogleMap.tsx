import React, { useEffect, useMemo } from 'react';
import { APIProvider, Map, useMap } from '@vis.gl/react-google-maps';
import { GoogleMapsOverlay } from '@deck.gl/google-maps';
import type { Layer } from '@deck.gl/core';
import type { MapPanelOptions } from '../../types';
import type { GoogleMapsOverlayProps } from '@deck.gl/google-maps';

function OverlayController(props: GoogleMapsOverlayProps) {
  const map = useMap();

  const overlay = useMemo(() => {
    let dpr: number;
    const overlay = new GoogleMapsOverlay({
      interleaved: true, ...props,
      onResize: (size: {width: number, height: number}) => {
        const deck = (overlay as any)._deck;
        if (!deck) {return;}
        const ctx = deck.animationLoop.animationProps.canvasContext
        if (dpr === undefined) {
          dpr = ctx.devicePixelRatio;
        }
        ctx.setDrawingBufferSize(size.width * dpr, size.height * dpr);
      }
    });
    return overlay;
    // Intentionally run once
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!map) {return;}
    overlay.setMap(map);
    return () => { overlay.setMap(null); };
  }, [map, overlay]);

  // Synchronous during render (not useEffect) so deck.gl receives updated layers
  // before the browser paints, matching them to the same RAF cycle.
  overlay.setProps(props);

  return null;
}

interface GoogleMapProps {
  width: number;
  height: number;
  options: MapPanelOptions;
  layers: Layer[];
}

export function GoogleMap({ width, height, options, layers }: GoogleMapProps) {
  return (
    <APIProvider apiKey={options.googleMapsApiKey ?? ''}>
      <Map
        defaultCenter={{ lat: options.initialLatitude, lng: options.initialLongitude }}
        defaultZoom={options.initialZoom}
        style={{ width, height }}
        mapId={options.googleMapsMapId || undefined}
      >
        <OverlayController layers={layers} />
      </Map>
    </APIProvider>
  );
}
