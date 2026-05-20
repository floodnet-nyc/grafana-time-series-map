import type { AccessorFunction, Layer, PickingInfo } from '@deck.gl/core';
import type { Feature, Geometry } from 'geojson';
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
import type { LayerDatum, LayerTable } from '../utils/dataframe/layerTable';

export type { LayerExtensionInstance };

export type LayerSettingsObject = object;
export type LayerConfigBase<TType extends string = string, TSettings extends LayerSettingsObject = LayerSettingsObject> = BaseLayerConfig<TType, TSettings>;

export interface BaseLayerConfig<TType extends string, TSettings extends LayerSettingsObject> {
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

export type AccessorDependencyKey = readonly unknown[];
export type GetAccessorFunction = <O = unknown | undefined, T = any>(
  fieldRef?: SourceRef,
  defaultValue?: O
) => [AccessorFunction<T, O> | undefined, AccessorDependencyKey];

export type TypedGetAccessorFunction<O> = <T = any>(
  fieldRef?: SourceRef,
  defaultValue?: O
) => [AccessorFunction<T, O> | undefined, AccessorDependencyKey];

export type GeometryAccessorFunction<O, T = any> = (
  defaultValue?: O
) => [AccessorFunction<T, O>, AccessorDependencyKey];

export type LayerWithConfig<TLayerConfig extends LayerConfigBase = LayerConfigBase> = Layer & {
  props: Layer['props'] & { config?: TLayerConfig };
};

export type FeaturePickingInfo<TLayerConfig extends LayerConfigBase = LayerConfigBase> = Partial<PickingInfo<Feature>> & {
  object?: Feature;
  layer?: LayerWithConfig<TLayerConfig> | null;
};

export interface GetAccessorFunctions {
  number: TypedGetAccessorFunction<number>;
  array: TypedGetAccessorFunction<unknown[]>;
  numericArray: TypedGetAccessorFunction<number[]>;
  date: TypedGetAccessorFunction<Date>;
  dateMs: TypedGetAccessorFunction<number>;
  geometry: GeometryAccessorFunction<Geometry | null>;
  pointPosition: GeometryAccessorFunction<[number, number]>;
  path: GeometryAccessorFunction<number[][]>;
  polygon: GeometryAccessorFunction<number[][][]>;
}

export interface LayerRenderContext<TLayerConfig extends LayerConfigBase = LayerConfigBase> {
  config: TLayerConfig;
  panelOptions: unknown;
  data: LayerDatum[];
  table: LayerTable;
  features?: Feature[];
  featureCollection?: Feature[];
  cursorTimeMs: number;
  fromTimeMs: number;
  toTimeMs: number;
  timeFilterFlags: Uint8Array;
  joinedSourceValues?: Map<string, Map<string, Record<string, unknown>>>;
  derivedValues?: Array<Record<string, unknown>>;
  selectedKey?: string | null;
  onFeatureClick?: (feature: Feature, info: FeaturePickingInfo<TLayerConfig>) => void;
  onFeatureHover?: (feature: Feature | null, info: FeaturePickingInfo<TLayerConfig>) => void;
  getAccessor: GetAccessorFunction;
  getAccessors: GetAccessorFunctions;
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

export interface LayerDefinition<
  TLayerConfig extends LayerConfigBase = LayerConfigBase,
  TDatum extends LayerDatum = LayerDatum,
> {
  type: TLayerConfig['type'];
  label: string;
  createDefaultConfig: (index: number) => TLayerConfig;
  editorSections: LayerEditorSection[];
  renderLayers: (ctx: LayerRenderContext<TLayerConfig> & { data: TDatum[] }) => Layer[];
}
