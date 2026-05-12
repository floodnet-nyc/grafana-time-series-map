import { useEffect, useMemo } from 'react';
import { useMap } from '@vis.gl/react-google-maps';
import { GoogleMapsOverlay, type GoogleMapsOverlayProps } from '@deck.gl/google-maps';

export function GoogleDeckOverlay(props: GoogleMapsOverlayProps) {
  const map = useMap();

  const overlay = useMemo(() => {
    const resizeState: { dpr?: number } = {};
    const instance = new GoogleMapsOverlay({
      interleaved: props.interleaved ?? true,
      ...props,
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
    if (!map) {
      return;
    }

    overlay.setMap(map);
    return () => {
      overlay.setMap(null);
    };
  }, [map, overlay]);

  overlay.setProps(props);

  return null;
}
