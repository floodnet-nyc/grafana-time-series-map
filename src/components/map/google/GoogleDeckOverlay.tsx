import { useEffect, useMemo } from 'react';
import { useMap } from '@vis.gl/react-google-maps';
import { GoogleMapsOverlay, type GoogleMapsOverlayProps } from '@deck.gl/google-maps';
import { MapPanelOptions } from 'types';
import type { Widget } from '@deck.gl/core';
import { useGoogleWidgetControls } from './WidgetControl';

export type GoogleDeckOverlayProps = GoogleMapsOverlayProps & { options: MapPanelOptions; };

export function GoogleDeckOverlay({ options, ...props }: GoogleDeckOverlayProps) {
  const map = useMap();
  const widgets = useGoogleWidgetControls(map, props.widgets as Widget[] | undefined);
  const overlayProps = { ...props, widgets };

  const overlay = useMemo(() => {
    const resizeState: { dpr?: number } = {};
    const instance = new GoogleMapsOverlay({
      interleaved: overlayProps.interleaved ?? true,
      ...overlayProps,
      onResize: (size: { width: number; height: number }) => {
        const deck = (instance as any)._deck;
        if (!deck) {
          return;
        }

        const ctx = deck.animationLoop.animationProps.canvasContext;
        const dpr = resizeState.dpr ?? ctx.devicePixelRatio;
        resizeState.dpr = dpr;
        ctx.setDrawingBufferSize(size.width * dpr, size.height * dpr);
      },
    });

    return instance;
    // Intentionally run once
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!map) { return; }
    overlay.setMap(map);
    return () => overlay.setMap(null);
  }, [map, overlay]);

  useEffect(() => overlay?.setProps(overlayProps), [overlay, overlayProps]);

  return null;
}
