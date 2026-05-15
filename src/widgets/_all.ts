import type { Widget } from '@deck.gl/core';
import { 
  // gimbalWidgetDefinition, 
  resetViewWidgetDefinition, 
  // scrollbarWidgetDefinition, 
  zoomWidgetDefinition,
} from './navigation';
import { 
  compassWidgetDefinition, 
  geocoderWidgetDefinition, 
  scaleWidgetDefinition 
} from './geospatial';
import { 
  fullscreenWidgetDefinition, 
  // splitterWidgetDefinition 
} from './view';
import { 
  contextMenuWidgetDefinition, 
  infoWidgetDefinition, 
  popupWidgetDefinition 
} from './information';
import { 
  iconWidgetDefinition, 
  // selectorWidgetDefinition, 
  timelineWidgetDefinition, 
  // toggleWidgetDefinition 
} from './control';
import { 
  // loadingWidgetDefinition, 
  screenshotWidgetDefinition, 
  statsWidgetDefinition, 
  themeWidgetDefinition 
} from './utility';
import type { BlankWidgetConfig, WidgetCallbacks } from './types';
import './stylesheet.css';

export const widgetDefinitions = [
  // Navigation
  zoomWidgetDefinition,
  resetViewWidgetDefinition,
  // gimbalWidgetDefinition,
  // scrollbarWidgetDefinition,
  // Geospatial
  compassWidgetDefinition,
  geocoderWidgetDefinition,
  scaleWidgetDefinition,
  // View
  fullscreenWidgetDefinition,
  // splitterWidgetDefinition,
  // Information
  contextMenuWidgetDefinition,
  infoWidgetDefinition,
  popupWidgetDefinition,
  // Control
  iconWidgetDefinition,
  // toggleWidgetDefinition,
  // selectorWidgetDefinition,
  timelineWidgetDefinition,
  // Utility
  // loadingWidgetDefinition,
  screenshotWidgetDefinition,
  statsWidgetDefinition,
  themeWidgetDefinition,
] as const;

export type WidgetType = (typeof widgetDefinitions)[number]['type'] | '';
export type WidgetConfig = ReturnType<(typeof widgetDefinitions)[number]['createDefaultConfig']> | BlankWidgetConfig;

export function createWidgets(configs: WidgetConfig[], callbacks?: WidgetCallbacks): Widget[] {
  return configs.flatMap((config) => {
    if (!config.visible) {
      return [];
    }
    const def = widgetDefinitions.find((d) => d.type === config.type);
    return def ? [def.createWidget(config as never, callbacks)] : [];
  });
}

export type { WidgetCallbacks };
