import type { Widget, WidgetPlacement } from '@deck.gl/core';
import { useEffect, useRef } from 'react';
import { useMap, type ControlPosition, type IControl } from 'react-map-gl/maplibre';

function getControlPosition(placement: WidgetPlacement): ControlPosition {
  if (placement === 'fill') {
    return 'top-left';
  }
  return placement;
}

export class DeckWidgetControl implements IControl {
  private widget: Widget;
  private container: HTMLDivElement | null = null;

  constructor(widget: Widget) {
    this.widget = widget;
  }

  onAdd(): HTMLElement {
    const container = document.createElement('div');
    container.className = 'maplibregl-ctrl mapboxgl-ctrl deck-widget-ctrl';
    this.container = container;
    this.widget.props._container = container;
    return container;
  }

  onRemove(): void {
    if (this.container && this.widget.props._container === this.container) {
      this.widget.props._container = null;
    }
    this.container?.remove();
    this.container = null;
  }

  getDefaultPosition(): ControlPosition {
    return getControlPosition(this.widget.placement);
  }

  matches(widget: Widget) {
    return this.widget.id === widget.id && this.widget.placement === widget.placement;
  }

  setWidget(widget: Widget) {
    this.widget = widget;
    if (this.container) {
      widget.props._container = this.container;
    }
  }
}

export function useMaplibreWidgetControls(widgets?: Widget[]) {
  const { current: mapRef } = useMap();
  const map = mapRef?.getMap();
  const controlsRef = useRef(new Map<string, DeckWidgetControl>());

  useEffect(() => {
    if (!map) {
      return;
    }

    const nextControls = new Map<string, DeckWidgetControl>();

    for (const widget of widgets ?? []) {
      const existingControl = controlsRef.current.get(widget.id);
      if (existingControl?.matches(widget)) {
        existingControl.setWidget(widget);
        nextControls.set(widget.id, existingControl);
        continue;
      }

      if (existingControl) {
        map.removeControl(existingControl);
      }

      const control = new DeckWidgetControl(widget);
      map.addControl(control, control.getDefaultPosition());
      nextControls.set(widget.id, control);
    }

    for (const [widgetId, control] of controlsRef.current) {
      if (!nextControls.has(widgetId)) {
        map.removeControl(control);
      }
    }

    controlsRef.current = nextControls;
  }, [map, widgets]);

  useEffect(() => {
    return () => {
      if (!map) {
        return;
      }

      for (const control of controlsRef.current.values()) {
        map.removeControl(control);
      }
      controlsRef.current.clear();
    };
  }, [map]);

  return widgets;
}
