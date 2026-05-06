import React, { useEffect, useMemo, useRef } from 'react';
import { APIProvider, Map, useMap } from '@vis.gl/react-google-maps';
import { GoogleMapsOverlay } from '@deck.gl/google-maps';
import type { Layer } from '@deck.gl/core';
import type { MapPanelOptions } from '../../types';
import type { GoogleMapsOverlayProps } from '@deck.gl/google-maps';

function OverlayController(props: GoogleMapsOverlayProps) {
  const map = useMap();
  const overlayRef = useRef<GoogleMapsOverlay | null>(null);

  const overlay = useMemo(() => { 
    // const dpr = ctx.devicePixelRatio;
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
    // console.log("Adding to map", map, overlay);
    overlay.setMap(map);
    overlayRef.current = overlay;
    return () => { overlay.setMap(null); console.log("Removed from map");};
  }, [map, overlay]);

  useEffect(() => {
    overlay.setProps(props);
  }, [overlay, props]);

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
