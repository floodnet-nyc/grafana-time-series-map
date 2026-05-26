import { useEffect, useRef } from 'react';
import type { Widget, WidgetPlacement } from '@deck.gl/core';

export interface WidgetControlAdapter<TWidget extends Widget, TControl> {
  createControl: (widget: TWidget) => TControl;
  mountControl: (control: TControl) => void;
  unmountControl: (control: TControl) => void;
  matches: (control: TControl, widget: TWidget) => boolean;
  updateControl: (control: TControl, widget: TWidget) => void;
}

export function reconcileWidgetControls<TWidget extends Widget, TControl>(
  widgets: TWidget[] | undefined,
  currentControls: Map<string, TControl>,
  adapter: WidgetControlAdapter<TWidget, TControl>
) {
  const nextControls = new Map<string, TControl>();

  for (const widget of widgets ?? []) {
    const existingControl = currentControls.get(widget.id);
    if (existingControl && adapter.matches(existingControl, widget)) {
      adapter.updateControl(existingControl, widget);
      nextControls.set(widget.id, existingControl);
      continue;
    }

    if (existingControl) {
      adapter.unmountControl(existingControl);
    }

    const control = adapter.createControl(widget);
    adapter.mountControl(control);
    nextControls.set(widget.id, control);
  }

  for (const [widgetId, control] of currentControls) {
    if (!nextControls.has(widgetId)) {
      adapter.unmountControl(control);
    }
  }

  return nextControls;
}

/** Shared hook for reconciling deck.gl widgets into map-native controls. */
export function useWidgetControls<TControl>(
  map: unknown | null,
  widgets: Widget[] | undefined,
  adapter: WidgetControlAdapter<Widget, TControl>
): Widget[] {
  const controlsRef = useRef(new Map<string, TControl>());

  useEffect(() => {
    if (!map) {
      return;
    }

    controlsRef.current = reconcileWidgetControls(widgets, controlsRef.current, adapter);
  }, [map, widgets, adapter]);

  useEffect(() => {
    return () => {
      const controls = controlsRef.current;
      for (const control of controls.values()) {
        adapter.unmountControl(control);
      }
      controls.clear();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return widgets ?? [];
}

/** Resolve deck.gl WidgetPlacement to a standard placement string. */
export function resolvePlacement<TPosition>(
  placement: WidgetPlacement,
  fallback: TPosition,
  positionMap: Partial<Record<WidgetPlacement, TPosition>>
): TPosition {
  return positionMap[placement] ?? fallback;
}
