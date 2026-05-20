import type { Widget, WidgetPlacement } from '@deck.gl/core';
import { useEffect, useRef } from 'react';
import { reconcileWidgetControls } from '../widgetControlReconciler';

type NativeControlWidget = Widget & { viewId?: string | null };

function getControlPosition(placement: WidgetPlacement): google.maps.ControlPosition {
  switch (placement) {
    case 'top-right':
      return google.maps.ControlPosition.TOP_RIGHT;
    case 'bottom-left':
      return google.maps.ControlPosition.BOTTOM_LEFT;
    case 'bottom-right':
      return google.maps.ControlPosition.BOTTOM_RIGHT;
    case 'fill':
    case 'top-left':
    default:
      return google.maps.ControlPosition.TOP_LEFT;
  }
}

export class GoogleWidgetControl {
  private widget: NativeControlWidget;
  private container: HTMLDivElement | null = null;
  private map: google.maps.Map | null = null;
  private position: google.maps.ControlPosition | null = null;

  constructor(widget: NativeControlWidget) {
    this.widget = widget;
  }

  addToMap(map: google.maps.Map) {
    const container = document.createElement('div');
    container.className = 'deck-widget-ctrl';
    container.style.pointerEvents = 'auto';

    const position = getControlPosition(this.widget.placement);
    map.controls[position].push(container);

    this.container = container;
    this.map = map;
    this.position = position;
    this.widget.props._container = container;
    this.widget.viewId = null;
  }

  remove() {
    if (this.container && this.widget.props._container === this.container) {
      this.widget.props._container = null;
    }

    if (this.map && this.position !== null && this.container) {
      const controls = this.map.controls[this.position];
      const index = controls.getArray().indexOf(this.container);
      if (index >= 0) {
        controls.removeAt(index);
      }
    }

    this.container?.remove();
    this.container = null;
    this.map = null;
    this.position = null;
  }

  matches(widget: Widget) {
    return this.widget.id === widget.id && this.widget.placement === widget.placement;
  }

  setWidget(widget: NativeControlWidget) {
    this.widget = widget;
    if (this.container) {
      this.widget.props._container = this.container;
    }
    this.widget.viewId = null;
  }
}

export function useGoogleWidgetControls(map: google.maps.Map | null, widgets?: Widget[]) {
  const controlsRef = useRef(new Map<string, GoogleWidgetControl>());

  useEffect(() => {
    if (!map) {
      return;
    }

    controlsRef.current = reconcileWidgetControls(widgets as NativeControlWidget[] | undefined, controlsRef.current, {
      createControl: (widget) => new GoogleWidgetControl(widget),
      mountControl: (control) => control.addToMap(map),
      unmountControl: (control) => control.remove(),
      matches: (control, widget) => control.matches(widget),
      updateControl: (control, widget) => control.setWidget(widget),
    });
  }, [map, widgets]);

  useEffect(() => {
    return () => {
      for (const control of controlsRef.current.values()) {
        control.remove();
      }
      controlsRef.current.clear();
    };
  }, []);

  return widgets;
}
