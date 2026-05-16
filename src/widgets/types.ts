import type { Widget, WidgetProps } from '@deck.gl/core';
import type { LayerEditorSection } from '../layers/types';

export type WidgetEditorSection = LayerEditorSection;

export const PLACEMENTS = (['top-left', 'top-right', 'bottom-left', 'bottom-right'] as const).map(
  (v) => ({ label: v, value: v }),
);

export interface BaseWidgetConfig<TType extends string, TSettings> {
  id: string;
  type: TType;
  label: string;
  visible: boolean;
  settings: TSettings;
}

export type BlankWidgetConfig = BaseWidgetConfig<'', Record<string, never>>;

export interface WidgetViewStateChange {
  latitude?: number;
  longitude?: number;
  zoom?: number;
  bearing?: number;
  pitch?: number;
  delta?: number;
  viewId?: string;
  zoomX?: number;
  zoomY?: number;
  rotationOrbit?: number;
  rotationX?: number;
  transitionDuration?: number;
}

export interface WidgetCallbacks {
  onViewStateChange?: (next: WidgetViewStateChange) => void;
  /** The view state to reset to (used by ResetViewWidget in controlled mode). */
  resetViewState?: WidgetViewStateChange;
  playback?: {
    cursorTimeMs: number;
    timeRange: [number, number];
    playing: boolean;
    playInterval: number;
    onPlayingChange: (playing: boolean) => void;
    onSeekTo: (ms: number) => void;
    formatLabel: (value: number) => string;
  };
  themeMode?: 'light' | 'dark';
  onThemeModeChange?: (mode: 'light' | 'dark') => void;
}

export interface WidgetDefinition<TConfig extends BaseWidgetConfig<string, any> = BaseWidgetConfig<string, any>> {
  type: string;
  label: string;
  description: string;
  createDefaultConfig: (index: number) => TConfig;
  editorSections: WidgetEditorSection[];
  createWidget: (config: TConfig, callbacks?: WidgetCallbacks) => Widget<WidgetProps, any>;
}
