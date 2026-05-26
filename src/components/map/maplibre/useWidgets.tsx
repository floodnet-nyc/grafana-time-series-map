import React, { useMemo } from 'react';
import { FullscreenControl, NavigationControl, ScaleControl, type ControlPosition } from 'react-map-gl/maplibre';
import type { WidgetConfig } from '../../../widgets/_all';

function getPlacement(config: WidgetConfig, fallback: ControlPosition): ControlPosition {
  const placement = 'placement' in config.settings ? config.settings.placement : undefined;
  return placement === 'fill' || placement == null ? fallback : (placement as ControlPosition);
}

function filterMaplibreWidgets(widgets: WidgetConfig[]): [WidgetConfig[], React.ReactNode[]] {
  const native: React.ReactNode[] = [];

  const filteredWidgets = widgets
    .map((widget) => {
      if (!widget.visible || !widget.native) {
        return widget;
      }

      if (widget.type === 'compass') {
        native.push(
          <NavigationControl
            key={widget.id}
            position={getPlacement(widget, 'top-left')}
            showZoom={false}
            showCompass={true}
            visualizePitch={true}
          />
        );
        return null;
      }

      if (widget.type === 'zoom') {
        native.push(
          <NavigationControl
            key={widget.id}
            position={getPlacement(widget, 'top-left')}
            showZoom={true}
            showCompass={false}
          />
        );
        return null;
      }

      if (widget.type === 'scale') {
        native.push(<ScaleControl key={widget.id} position="bottom-left" />);
        return null;
      }

      if (widget.type === 'fullscreen') {
        native.push(<FullscreenControl key={widget.id} position={getPlacement(widget, 'top-right')} />);
        return null;
      }

      return widget;
    })
    .filter((widget): widget is WidgetConfig => Boolean(widget));

  return [filteredWidgets, native];
}

export function useMaplibreWidgets(widgets: WidgetConfig[] | undefined) {
  return useMemo(() => filterMaplibreWidgets(widgets ?? []), [widgets]);
}
