import type { Widget } from '@deck.gl/core';
import {
  // gimbalWidgetDefinition,
  resetViewWidgetDefinition,
  // scrollbarWidgetDefinition,
  zoomWidgetDefinition,
} from './categories/navigation';
import {
  compassWidgetDefinition,
  geolocateWidgetDefinition,
  geocoderWidgetDefinition,
  scaleWidgetDefinition,
} from './categories/geospatial';
import {
  fullscreenWidgetDefinition,
  // splitterWidgetDefinition
} from './categories/view';
import {
  // contextMenuWidgetDefinition,
  // infoWidgetDefinition,
  // popupWidgetDefinition,
  messageWidgetDefinition,
  streetViewWidgetDefinition,
} from './categories/information';
import {
  // iconWidgetDefinition,
  // selectorWidgetDefinition,
  timelineWidgetDefinition,
  // toggleWidgetDefinition
} from './categories/control';
import {
  // loadingWidgetDefinition,
  screenshotWidgetDefinition,
  statsWidgetDefinition,
  themeWidgetDefinition,
} from './categories/utility';
import type { BlankWidgetConfig, GoogleNativeControlProps, WidgetCallbacks } from './types';
import { DarkGlassTheme, LightGlassTheme } from '@deck.gl/widgets';
import './deckgl-widgets-stylesheet-do-not-edit.css';
import './styles.css';

export const widgetDefinitions = [
  // Navigation
  zoomWidgetDefinition,
  resetViewWidgetDefinition,
  // gimbalWidgetDefinition,
  // scrollbarWidgetDefinition,
  // Geospatial
  compassWidgetDefinition,
  geolocateWidgetDefinition,
  geocoderWidgetDefinition,
  scaleWidgetDefinition,
  // View
  fullscreenWidgetDefinition,
  // splitterWidgetDefinition,
  // Information
  // contextMenuWidgetDefinition,

  // infoWidgetDefinition,
  // popupWidgetDefinition,

  // Control
  // iconWidgetDefinition,
  // toggleWidgetDefinition,
  // selectorWidgetDefinition,
  timelineWidgetDefinition,
  // Utility
  // loadingWidgetDefinition,
  screenshotWidgetDefinition,
  statsWidgetDefinition,
  themeWidgetDefinition,
  messageWidgetDefinition,
  streetViewWidgetDefinition,
] as const;

export type WidgetType = (typeof widgetDefinitions)[number]['type'] | '';
export type WidgetConfig = ReturnType<(typeof widgetDefinitions)[number]['createDefaultConfig']> | BlankWidgetConfig;

export function createWidgets(configs: WidgetConfig[], callbacks?: WidgetCallbacks): Widget[] {
  return configs.flatMap((config) => {
    if (!config.visible || config.native) {
      return [];
    }
    const def = widgetDefinitions.find((d) => d.type === config.type);
    if (!def) return [];
    const w = def.createWidget(config as never, callbacks);
    w.setProps({ style: callbacks?.themeMode === 'dark' ? DarkGlassTheme : LightGlassTheme });
    return w ? [w] : [];
  });
}

export function resolveGoogleNativeProps(configs: WidgetConfig[]): Partial<GoogleNativeControlProps> {
  const props: Partial<GoogleNativeControlProps> = {};
  for (const config of configs) {
    if (!config.visible || !config.native) continue;
    const def = widgetDefinitions.find((d) => d.type === config.type);
    if (def?.nativeControls?.google) {
      Object.assign(props, def.nativeControls.google(config as never));
    }
  }
  return props;
}

export function resolveMaplibreNativeControls(configs: WidgetConfig[]): React.ReactNode[] {
  const controls: React.ReactNode[] = [];
  for (const config of configs) {
    if (!config.visible || !config.native) continue;
    const def = widgetDefinitions.find((d) => d.type === config.type);
    if (def?.nativeControls?.maplibre) {
      const node = def.nativeControls.maplibre(config as never);
      if (node) controls.push(node);
    }
  }
  return controls;
}

export type { WidgetCallbacks };
