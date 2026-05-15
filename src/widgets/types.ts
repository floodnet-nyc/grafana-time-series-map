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

export interface WidgetCallbacks {
  onViewStateChange?: (next: object) => void;
  /** The view state to reset to (used by ResetViewWidget in controlled mode). */
  resetViewState?: object;
  playback?: {
    cursorTimeMs: number;
    playing: boolean;
    onPlayingChange: (playing: boolean) => void;
    onSeekTo: (ms: number) => void;
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
