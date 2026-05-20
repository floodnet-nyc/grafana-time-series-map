import type { FlyToInterpolator, Widget } from '@deck.gl/core';
import type { ScreenshotWidget } from '@deck.gl/widgets';
import type { Feature } from 'geojson';
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
  /** Render as a native map control instead of a DeckGL overlay (requires widget definition nativeControls). */
  native?: boolean;
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
  transitionDuration?: number | 'auto';
  transitionInterpolator?: FlyToInterpolator;
}

export interface ResetViewState {
  latitude: number;
  longitude: number;
  zoom: number;
  bearing: number;
  pitch: number;
}

export interface WidgetCallbacks {
  provider?: 'google' | 'maplibre';
  onViewStateChange?: (next: WidgetViewStateChange) => void;
  /** The view state to reset to (used by ResetViewWidget in controlled mode). */
  resetViewState?: ResetViewState;
  geolocate?: {
    onLocation: (next: { latitude: number; longitude: number; zoom: number; accuracy?: number }) => void;
  };
  screenshot?: {
    onCapture: (widget: ScreenshotWidget) => void | Promise<void>;
  };
  playback?: {
    cursorTimeMs: number;
    timeRange: [number, number];
    playing: boolean;
    playInterval: number;
    onPlayingChange: (playing: boolean) => void;
    onSeekTo: (ms: number) => void;
    formatLabel: (value: number) => string;
  };
  selection?: {
    key: string | null;
    feature: Feature | null;
  };
  themeMode?: 'light' | 'dark';
  onThemeModeChange?: (mode: 'light' | 'dark') => void;
}

export type GoogleNativeControlProps = Pick<
  google.maps.MapOptions,
  | 'zoomControl'
  | 'zoomControlOptions'
  | 'cameraControl'
  | 'cameraControlOptions'
  | 'fullscreenControl'
  | 'fullscreenControlOptions'
  | 'scaleControl'
  | 'scaleControlOptions'
  | 'rotateControl'
  | 'rotateControlOptions'
  | 'streetViewControl'
  | 'streetViewControlOptions'
>;

export interface WidgetDefinition<
  TConfig extends BaseWidgetConfig<string, Record<string, unknown>> = BaseWidgetConfig<string, Record<string, unknown>>
> {
  type: string;
  label: string;
  description: string;
  supportedMapProviders?: Array<('google' | 'maplibre' | 'deck')>;
  createDefaultConfig: (index: number) => TConfig;
  editorSections: WidgetEditorSection[];
  createWidget: (config: TConfig, callbacks?: WidgetCallbacks) => Widget;
  /** Provider-specific native control configuration used when config.native is true. */
  nativeControls?: {
    /** Returns props to spread onto the Google Maps <Map> component. */
    google?: (config: TConfig) => Partial<GoogleNativeControlProps>;
    /** Returns a React element rendered as a native child of the MapLibre <Map> component. */
    maplibre?: (config: TConfig) => React.ReactNode;
  };
}
