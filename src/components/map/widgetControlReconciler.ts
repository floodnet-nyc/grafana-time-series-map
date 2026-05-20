import type { Widget } from '@deck.gl/core';

type WidgetControlAdapter<TWidget extends Widget, TControl> = {
  createControl: (widget: TWidget) => TControl;
  mountControl: (control: TControl) => void;
  unmountControl: (control: TControl) => void;
  matches: (control: TControl, widget: TWidget) => boolean;
  updateControl: (control: TControl, widget: TWidget) => void;
};

export function reconcileWidgetControls<TWidget extends Widget, TControl>(
  widgets: TWidget[] | undefined,
  currentControls: Map<string, TControl>,
  adapter: WidgetControlAdapter<TWidget, TControl>,
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
