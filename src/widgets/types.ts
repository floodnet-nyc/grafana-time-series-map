import type { Widget, WidgetProps } from '@deck.gl/core';
import type {
  ZoomWidgetProps,
  ResetViewWidgetProps,
  GimbalWidgetProps,
  ScrollbarWidgetProps,
  CompassWidgetProps,
  ScaleWidgetProps,
  GeocoderWidgetProps,
  FullscreenWidgetProps,
  SplitterWidgetProps,
  ContextMenuWidgetProps,
  InfoWidgetProps,
  PopupWidgetProps,
  IconWidgetProps,
  ToggleWidgetProps,
  SelectorWidgetProps,
  TimelineWidgetProps,
  LoadingWidgetProps,
  ScreenshotWidgetProps,
  StatsWidgetProps,
  ThemeWidgetProps,
} from '@deck.gl/widgets';
import type { LayerEditorSection } from '../layers/types';

export type WidgetEditorSection = LayerEditorSection;

export const PLACEMENTS = (['top-left', 'top-right', 'bottom-left', 'bottom-right'] as const).map(
  (v) => ({ label: v, value: v }),
);

export type WidgetType =
  | 'zoom'
  | 'reset-view'
  | 'gimbal'
  | 'scrollbar'
  | 'compass'
  | 'geocoder'
  | 'scale'
  | 'fullscreen'
  | 'splitter'
  | 'context-menu'
  | 'info'
  | 'popup'
  | 'icon'
  | 'toggle'
  | 'selector'
  | 'timeline'
  | 'loading'
  | 'screenshot'
  | 'stats'
  | 'theme';

export interface BaseWidgetConfig<TType extends WidgetType, TSettings> {
  id: string;
  type: TType;
  label: string;
  visible: boolean;
  settings: TSettings;
}

// Settings = widget props minus id (id is promoted to BaseWidgetConfig)
export type ZoomWidgetSettings = Omit<ZoomWidgetProps, 'id'>;
export type ResetViewWidgetSettings = Omit<ResetViewWidgetProps, 'id'>;
export type GimbalWidgetSettings = Omit<GimbalWidgetProps, 'id'>;
export type ScrollbarWidgetSettings = Omit<ScrollbarWidgetProps, 'id'>;
export type CompassWidgetSettings = Omit<CompassWidgetProps, 'id'>;
export type ScaleWidgetSettings = Omit<ScaleWidgetProps, 'id'>;
export type GeocoderWidgetSettings = Omit<GeocoderWidgetProps, 'id'>;
export type FullscreenWidgetSettings = Omit<FullscreenWidgetProps, 'id'>;
export type SplitterWidgetSettings = Omit<SplitterWidgetProps, 'id'>;
export type ContextMenuWidgetSettings = Omit<ContextMenuWidgetProps, 'id'>;
export type InfoWidgetSettings = Omit<InfoWidgetProps, 'id'>;
export type PopupWidgetSettings = Omit<PopupWidgetProps, 'id'>;
export type IconWidgetSettings = Omit<IconWidgetProps, 'id'>;
export type ToggleWidgetSettings = Omit<ToggleWidgetProps, 'id'>;
export type SelectorWidgetSettings = Omit<SelectorWidgetProps, 'id'>;
export type TimelineWidgetSettings = Omit<TimelineWidgetProps, 'id'>;
export type LoadingWidgetSettings = Omit<LoadingWidgetProps, 'id'>;
export type ScreenshotWidgetSettings = Omit<ScreenshotWidgetProps, 'id'>;
export type StatsWidgetSettings = Omit<StatsWidgetProps, 'id'>;
export type ThemeWidgetSettings = Omit<ThemeWidgetProps, 'id'>;

export type ZoomWidgetConfig = BaseWidgetConfig<'zoom', ZoomWidgetSettings>;
export type ResetViewWidgetConfig = BaseWidgetConfig<'reset-view', ResetViewWidgetSettings>;
export type GimbalWidgetConfig = BaseWidgetConfig<'gimbal', GimbalWidgetSettings>;
export type ScrollbarWidgetConfig = BaseWidgetConfig<'scrollbar', ScrollbarWidgetSettings>;
export type CompassWidgetConfig = BaseWidgetConfig<'compass', CompassWidgetSettings>;
export type ScaleWidgetConfig = BaseWidgetConfig<'scale', ScaleWidgetSettings>;
export type GeocoderWidgetConfig = BaseWidgetConfig<'geocoder', GeocoderWidgetSettings>;
export type FullscreenWidgetConfig = BaseWidgetConfig<'fullscreen', FullscreenWidgetSettings>;
export type SplitterWidgetConfig = BaseWidgetConfig<'splitter', SplitterWidgetSettings>;
export type ContextMenuWidgetConfig = BaseWidgetConfig<'context-menu', ContextMenuWidgetSettings>;
export type InfoWidgetConfig = BaseWidgetConfig<'info', InfoWidgetSettings>;
export type PopupWidgetConfig = BaseWidgetConfig<'popup', PopupWidgetSettings>;
export type IconWidgetConfig = BaseWidgetConfig<'icon', IconWidgetSettings>;
export type ToggleWidgetConfig = BaseWidgetConfig<'toggle', ToggleWidgetSettings>;
export type SelectorWidgetConfig = BaseWidgetConfig<'selector', SelectorWidgetSettings>;
export type TimelineWidgetConfig = BaseWidgetConfig<'timeline', TimelineWidgetSettings>;
export type LoadingWidgetConfig = BaseWidgetConfig<'loading', LoadingWidgetSettings>;
export type ScreenshotWidgetConfig = BaseWidgetConfig<'screenshot', ScreenshotWidgetSettings>;
export type StatsWidgetConfig = BaseWidgetConfig<'stats', StatsWidgetSettings>;
export type ThemeWidgetConfig = BaseWidgetConfig<'theme', ThemeWidgetSettings>;

export type WidgetConfig =
  | ZoomWidgetConfig
  | ResetViewWidgetConfig
  | GimbalWidgetConfig
  | ScrollbarWidgetConfig
  | CompassWidgetConfig
  | ScaleWidgetConfig
  | GeocoderWidgetConfig
  | FullscreenWidgetConfig
  | SplitterWidgetConfig
  | ContextMenuWidgetConfig
  | InfoWidgetConfig
  | PopupWidgetConfig
  | IconWidgetConfig
  | ToggleWidgetConfig
  | SelectorWidgetConfig
  | TimelineWidgetConfig
  | LoadingWidgetConfig
  | ScreenshotWidgetConfig
  | StatsWidgetConfig
  | ThemeWidgetConfig;

export interface WidgetDefinition<TConfig extends WidgetConfig = WidgetConfig> {
  type: WidgetType;
  label: string;
  createDefaultConfig: (index: number) => TConfig;
  editorSections: WidgetEditorSection[];
  createWidget: (config: TConfig) => Widget<WidgetProps, any>;
}
