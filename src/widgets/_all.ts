import type { Widget } from '@deck.gl/core';
import { gimbalWidgetDefinition, resetViewWidgetDefinition, scrollbarWidgetDefinition, zoomWidgetDefinition } from './navigation';
import { compassWidgetDefinition, geocoderWidgetDefinition, scaleWidgetDefinition } from './geospatial';
import { fullscreenWidgetDefinition, splitterWidgetDefinition } from './view';
import { contextMenuWidgetDefinition, infoWidgetDefinition, popupWidgetDefinition } from './information';
import { iconWidgetDefinition, selectorWidgetDefinition, timelineWidgetDefinition, toggleWidgetDefinition } from './control';
import { loadingWidgetDefinition, screenshotWidgetDefinition, statsWidgetDefinition, themeWidgetDefinition } from './utility';
import type { WidgetConfig, WidgetDefinition } from './types';
import '@deck.gl/widgets/stylesheet.css';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const widgetDefinitions: Array<WidgetDefinition<any>> = [
  // Navigation
  zoomWidgetDefinition,
  resetViewWidgetDefinition,
  gimbalWidgetDefinition,
  scrollbarWidgetDefinition,
  // Geospatial
  compassWidgetDefinition,
  geocoderWidgetDefinition,
  scaleWidgetDefinition,
  // View
  fullscreenWidgetDefinition,
  splitterWidgetDefinition,
  // Information
  contextMenuWidgetDefinition,
  infoWidgetDefinition,
  popupWidgetDefinition,
  // Control
  iconWidgetDefinition,
  toggleWidgetDefinition,
  selectorWidgetDefinition,
  timelineWidgetDefinition,
  // Utility
  loadingWidgetDefinition,
  screenshotWidgetDefinition,
  statsWidgetDefinition,
  themeWidgetDefinition,
];


export function createWidgets(configs: WidgetConfig[]): Widget[] {
  return configs.flatMap((config) => {
    if (!config.visible) {
      return [];
    }
    const def = widgetDefinitions.find((d) => d.type === config.type);
    return def ? [def.createWidget(config as never)] : [];
  });
}
