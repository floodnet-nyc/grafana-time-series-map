import type { AccessorFunction, Layer } from '@deck.gl/core';
import type { Feature } from 'geojson';
import type {
  ColorScaleConfig,
  DataSource,
  GeometrySource,
  LayerDataConfig,
  LayerDerivedFieldConfig,
  SourceRef,
  ShaderConfig,
  TimeFilterConfig,
} from '../types';
import type { LayerExtensionInstance } from '../extensions/types';

export type { LayerExtensionInstance };

export interface BaseLayerConfig<TType extends string, TSettings> {
  id: string;
  type: TType;
  settings: TSettings;
  derivedFields?: LayerDerivedFieldConfig[];
  label: string;
  visible: boolean;
  data: LayerDataConfig;
  dataSource?: DataSource;
  geometry: GeometrySource;
  timeFilter: TimeFilterConfig;
  opacity: number;
  colorScale?: ColorScaleConfig;
  showInLegend?: boolean;
  description?: string;
  minZoom?: number;
  maxZoom?: number;
  pickable?: boolean;
  selectionKey?: SourceRef;
  selectionColor?: [number, number, number, number];
  shader?: ShaderConfig;
  extensions?: LayerExtensionInstance[];
}

export type GetAccessorFunction = <O = any, T extends Feature = Feature>(fieldRef?: SourceRef, defaultValue?: O) => [AccessorFunction<T, O | undefined> | undefined, any[]];
export type GetNumericAccessorFunction = <T extends Feature = Feature>(fieldRef?: SourceRef, defaultValue?: number) => [AccessorFunction<T, number> | undefined, any[]];

export interface LayerRenderContext<TLayerConfig extends BaseLayerConfig<string, any> = BaseLayerConfig<string, any>> {
  config: TLayerConfig;
  panelOptions: unknown;
  features: Feature[];
  cursorTimeMs: number;
  fromTimeMs: number;
  toTimeMs: number;
  timeFilterFlags: Uint8Array;
  joinedSourceValues?: Map<string, Map<string, Record<string, unknown>>>;
  derivedValues?: Array<Record<string, unknown>>;
  selectedKey?: string | null;
  onFeatureClick?: (feature: Feature, info: unknown) => void;
  onFeatureHover?: (feature: Feature | null, info: unknown) => void;
  getAccessor: GetAccessorFunction;
  getNumericAccessor: GetNumericAccessorFunction;
}

export interface LayerOptionField {
  key: string;
  label: string;
  type: 'number' | 'string' | 'boolean' | 'select' | 'color' | 'fieldPicker' | 'sourceRef' | 'html';
  defaultValue?: unknown;
  section?: string;
  min?: number;
  max?: number;
  step?: number;
  selectOptions?: Array<{ label: string; value: string | number }>;
  showIf?: (settings: Record<string, unknown>) => boolean;
}

export interface LayerEditorSection {
  title?: string;
  fields: LayerOptionField[];
}

export interface LayerDefinition<TLayerConfig extends BaseLayerConfig<string, any> = BaseLayerConfig<string, any>> {
  type: string;
  label: string;
  createDefaultConfig: (index: number) => TLayerConfig;
  editorSections: LayerEditorSection[];
  renderLayers: (ctx: LayerRenderContext<TLayerConfig>) => Layer[];
}
