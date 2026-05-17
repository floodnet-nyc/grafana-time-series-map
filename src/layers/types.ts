import type { Layer } from '@deck.gl/core';
import type { Feature } from 'geojson';
import type {
  ColorScaleConfig,
  DataSource,
  ElevationConfig,
  FieldMapping,
  GeometrySource,
  LayerDerivedFieldConfig,
  LayerSecondarySourceConfig,
  ShaderConfig,
  TimeFilterConfig,
} from '../types';
import type { LayerExtensionInstance } from '../extensions/types';

export type { LayerExtensionInstance };

export interface BaseLayerConfig<TType extends string, TSettings> {
  id: string;
  type: TType;
  settings: TSettings;
  secondarySources?: LayerSecondarySourceConfig[];
  derivedFields?: LayerDerivedFieldConfig[];
  label: string;
  visible: boolean;
  queryRefId?: string;
  dataSource?: DataSource;
  geometry: GeometrySource;
  elevation?: ElevationConfig;
  timeFilter: TimeFilterConfig;
  fieldMappings: FieldMapping[];
  opacity: number;
  colorScale?: ColorScaleConfig;
  showInLegend?: boolean;
  description?: string;
  minZoom?: number;
  maxZoom?: number;
  pickable?: boolean;
  selectionKeyField?: string;
  shader?: ShaderConfig;
  extensions?: LayerExtensionInstance[];
}

export interface LayerRenderContext<TLayerConfig extends BaseLayerConfig<string, any> = BaseLayerConfig<string, any>> {
  config: TLayerConfig;
  panelOptions: unknown;
  features: Feature[];
  cursorTimeMs: number;
  fromTimeMs: number;
  toTimeMs: number;
  timeFilterFlags: Uint8Array;
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

export interface LayerDefinition<TLayerConfig extends BaseLayerConfig<string, any> = BaseLayerConfig<string, any>> {
  type: string;
  label: string;
  createDefaultConfig: (index: number) => TLayerConfig;
  editorSections: LayerEditorSection[];
  renderLayers: (ctx: LayerRenderContext<TLayerConfig>) => Layer[];
}
