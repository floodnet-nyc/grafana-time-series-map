import { useMemo } from 'react';
import type { WidgetConfig } from '../../../widgets/_all';
import { getControlPosition, mapControlToGooglePosition } from './controlMappings';

export type GoogleNativeControlProps = Pick<
  google.maps.MapOptions,
  | 'zoomControl'
  | 'zoomControlOptions'
  | 'cameraControl'
  | 'cameraControlOptions'
  | 'fullscreenControl'
  | 'fullscreenControlOptions'
  | 'scaleControl'
  | 'scaleControlOptions'
  | 'rotateControl'
  | 'rotateControlOptions'
  | 'streetViewControl'
  | 'streetViewControlOptions'
>;

function getPlacement(config: WidgetConfig, fallback: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right') {
  const placement = 'placement' in config.settings ? config.settings.placement : undefined;
  return placement === 'fill' || placement == null ? fallback : placement;
}

function filterGoogleWidgets(widgets: WidgetConfig[]): [WidgetConfig[], Partial<GoogleNativeControlProps>] {
  const native: Partial<GoogleNativeControlProps> = {};

  const filteredWidgets = widgets
    .map((widget) => {
      if (!widget.visible || !widget.native) {
        return widget;
      }

      if (widget.type === 'compass') {
        const placement = getPlacement(widget, 'top-left');
        native.rotateControl = true;
        native.rotateControlOptions = {
          position: getControlPosition(mapControlToGooglePosition(placement), 'INLINE_START_BLOCK_END'),
        };
        return null;
      }

      if (widget.type === 'zoom') {
        const placement = getPlacement(widget, 'top-left');
        native.zoomControl = true;
        native.zoomControlOptions = {
          position: getControlPosition(mapControlToGooglePosition(placement), 'TOP_LEFT'),
        };
        return null;
      }

      if (widget.type === 'scale') {
        native.scaleControl = true;
        return null;
      }

      if (widget.type === 'fullscreen') {
        const placement = getPlacement(widget, 'top-right');
        native.fullscreenControl = true;
        native.fullscreenControlOptions = {
          position: getControlPosition(mapControlToGooglePosition(placement), 'TOP_RIGHT'),
        };
        return null;
      }

      if (widget.type === 'street-view') {
        const placement = getPlacement(widget, 'bottom-right');
        native.streetViewControl = true;
        native.streetViewControlOptions = {
          position: getControlPosition(mapControlToGooglePosition(placement), 'BOTTOM_RIGHT'),
        };
        return null;
      }

      return widget;
    })
    .filter((widget): widget is WidgetConfig => Boolean(widget));

  return [filteredWidgets, native];
}

export function useGoogleWidgets(widgets: WidgetConfig[] | undefined) {
  return useMemo(() => filterGoogleWidgets(widgets ?? []), [widgets]);
}
