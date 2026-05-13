import type { Layer } from '@deck.gl/core';
import type { Feature } from 'geojson';
import type { LayerConfig, LayerType, MapPanelOptions } from '../types';

export interface LayerRenderContext<TLayerConfig extends LayerConfig = LayerConfig> {
  config: TLayerConfig;
  panelOptions: MapPanelOptions;
  features: Feature[];
  cursorTimeMs: number;
  fromTimeMs: number;
  toTimeMs: number;
  timeFilterFlags: Uint8Array;
  lookupValues?: Map<string, Record<string, number>>;
  secondarySourceValues?: Map<string, Map<string, Record<string, number>>>;
  derivedValues?: Array<Record<string, unknown>>;
  selectedKey?: string | null;
  onFeatureClick?: (feature: Feature, info: unknown) => void;
}

export interface LayerOptionField {
  key: string;
  label: string;
  type: 'number' | 'string' | 'boolean' | 'select' | 'color' | 'fieldPicker';
  defaultValue?: unknown;
  section?: string;
  min?: number;
  max?: number;
  step?: number;
  selectOptions?: Array<{ label: string; value: string | number }>;
  showIf?: (settings: Record<string, unknown>) => boolean;
}

export interface LayerEditorSection {
  title: string;
  fields: LayerOptionField[];
}

export interface LayerDefinition<TLayerConfig extends LayerConfig = LayerConfig> {
  type: LayerType;
  label: string;
  createDefaultConfig: (index: number) => TLayerConfig;
  editorSections: LayerEditorSection[];
  renderLayers: (ctx: LayerRenderContext<TLayerConfig>) => Layer[];
}
