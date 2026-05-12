import type { Layer } from '@deck.gl/core';
import type { Feature } from 'geojson';
import type { LayerConfig, MapPanelOptions } from '../types';

export interface LayerRenderContext<TOptions extends object = Record<string, unknown>> {
  config: LayerConfig;
  options: TOptions;
  panelOptions: MapPanelOptions;
  features: Feature[];
  cursorTimeMs: number;
  fromTimeMs: number;
  toTimeMs: number;
  timeFilterFlags: Uint8Array;
  /** Per-group scalar values resolved from the layer's lookup query at the current cursor time. */
  lookupValues?: Map<string, Record<string, number>>;
  /** Key of the currently selected feature (matched against timeFilter.groupByField). */
  selectedKey?: string | null;
  onFeatureClick?: (feature: Feature, info: any) => void;
}

export interface LayerOptionField {
  key: string;
  label: string;
  type: 'number' | 'string' | 'boolean' | 'select' | 'color' | 'fieldPicker';
  defaultValue?: unknown;
  min?: number;
  max?: number;
  step?: number;
  selectOptions?: Array<{ label: string; value: string | number }>;
  showIf?: (options: Record<string, unknown>) => boolean;
  section?: string;
}

export interface LayerRenderer<TOptions extends object = Record<string, unknown>> {
  type: string;
  label: string;
  defaultOptions: TOptions;
  optionsSchema: LayerOptionField[];
  renderLayers(ctx: LayerRenderContext<TOptions>): Layer[];
}
