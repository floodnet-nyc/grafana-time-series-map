import type { Layer } from '@deck.gl/core';
import type { Feature } from 'geojson';
import type {
  ColorScaleConfig,
  ElevationConfig,
  FieldMapping,
  GeometrySource,
  LayerDerivedFieldConfig,
  LayerExtensionsConfig,
  LayerSecondarySourceConfig,
  LookupConfig,
  ShaderConfig,
  TimeFilterConfig,
} from '../types';

export interface ScatterplotLayerSettings {
  radiusMinPixels: number;
  radiusMaxPixels: number;
  radiusField: string;
  radiusScale: number;
  stroked: boolean;
  showLabels: boolean;
  labelField: string;
}

export interface ArcLayerSettings {
  widthMinPixels: number;
  greatCircle: boolean;
  srcLngField: string;
  srcLatField: string;
  tgtLngField: string;
  tgtLatField: string;
}

export interface HeatmapLayerSettings {
  radiusPixels: number;
  intensity: number;
  threshold: number;
  weightField: string;
  colorRange: string;
}

export interface HexagonLayerSettings {
  radius: number;
  coverage: number;
  extruded: boolean;
  elevationScale: number;
  elevationWeightField: string;
  elevationAggregation: 'SUM' | 'MEAN' | 'MIN' | 'MAX';
  colorWeightField: string;
  colorAggregation: 'SUM' | 'MEAN' | 'MIN' | 'MAX';
  colorRange: string;
  lowerPercentile: number;
  upperPercentile: number;
}

export interface PathLayerSettings {
  widthMinPixels: number;
  widthMaxPixels: number;
  widthField: string;
  widthScale: number;
  capRounded: boolean;
  jointRounded: boolean;
}

export interface LineLayerSettings {
  srcLngField: string;
  srcLatField: string;
  tgtLngField: string;
  tgtLatField: string;
  widthMinPixels: number;
  widthMaxPixels: number;
  widthField: string;
  widthScale: number;
}

export interface PolygonLayerSettings {
  fillOpacity: number;
  extruded: boolean;
  elevationField: string;
  elevationScale: number;
}

export interface GeoJsonLayerSettings {
  pointRadiusMinPixels: number;
  pointRadiusMaxPixels: number;
  lineWidthMinPixels: number;
  filled: boolean;
  stroked: boolean;
  extruded: boolean;
}

export interface IconLayerSettings {
  fixedIcon: string;
  iconField: string;
  iconAtlasUrl: string;
  iconMappingUrl: string;
  sizeScale: number;
  sizeMinPixels: number;
  sizeMaxPixels: number;
  sizeField: string;
  billboard: boolean;
  alphaCutoff: number;
}

export interface TextLayerSettings {
  textField: string;
  fontSize: number;
  sizeMinPixels: number;
  sizeMaxPixels: number;
  sizeField: string;
  fontFamily: string;
  fontWeight: string;
  anchor: 'start' | 'middle' | 'end';
  baseline: 'top' | 'center' | 'bottom';
  billboard: boolean;
  background: boolean;
  pixelOffsetX: number;
  pixelOffsetY: number;
}

export interface TripsLayerSettings {
  timestampsField: string;
  timestampUnit: 'ms' | 's';
  trailLengthMs: number;
  fadeTrail: boolean;
  widthMinPixels: number;
  widthMaxPixels: number;
  widthField: string;
  widthScale: number;
  capRounded: boolean;
  jointRounded: boolean;
}

export interface CogLayerSettings {
  urlField: string;
  timestampField: string;
  colorMaxValue: number;
  maxRequests: number;
  maxFrameRate: number;
}

export interface FloodInundationLayerSettings {
  depthDiffField: string;
  fillOpacity: number;
}

export type LayerType =
  | 'scatterplot'
  | 'arc'
  | 'heatmap'
  | 'hexagon'
  | 'path'
  | 'line'
  | 'polygon'
  | 'geojson'
  | 'icon'
  | 'text'
  | 'trips'
  | 'cog'
  | 'flood-inundation';

export interface BaseLayerConfig<TType extends LayerType, TSettings> {
  id: string;
  type: TType;
  settings: TSettings;
  lookup?: LookupConfig;
  secondarySources?: LayerSecondarySourceConfig[];
  derivedFields?: LayerDerivedFieldConfig[];
  label: string;
  visible: boolean;
  queryRefId?: string;
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
  shader?: ShaderConfig;
  extensions?: LayerExtensionsConfig;
}

export type ScatterplotLayerConfig = BaseLayerConfig<'scatterplot', ScatterplotLayerSettings>;
export type ArcLayerConfig = BaseLayerConfig<'arc', ArcLayerSettings>;
export type HeatmapLayerConfig = BaseLayerConfig<'heatmap', HeatmapLayerSettings>;
export type HexagonLayerConfig = BaseLayerConfig<'hexagon', HexagonLayerSettings>;
export type PathLayerConfig = BaseLayerConfig<'path', PathLayerSettings>;
export type LineLayerConfig = BaseLayerConfig<'line', LineLayerSettings>;
export type PolygonLayerConfig = BaseLayerConfig<'polygon', PolygonLayerSettings>;
export type GeoJsonLayerConfig = BaseLayerConfig<'geojson', GeoJsonLayerSettings>;
export type IconLayerConfig = BaseLayerConfig<'icon', IconLayerSettings>;
export type TextLayerConfig = BaseLayerConfig<'text', TextLayerSettings>;
export type TripsLayerConfig = BaseLayerConfig<'trips', TripsLayerSettings>;
export type CogLayerConfig = BaseLayerConfig<'cog', CogLayerSettings>;
export type FloodInundationLayerConfig = BaseLayerConfig<'flood-inundation', FloodInundationLayerSettings>;

export type LayerConfig =
  | ScatterplotLayerConfig
  | ArcLayerConfig
  | HeatmapLayerConfig
  | HexagonLayerConfig
  | PathLayerConfig
  | LineLayerConfig
  | PolygonLayerConfig
  | GeoJsonLayerConfig
  | IconLayerConfig
  | TextLayerConfig
  | TripsLayerConfig
  | CogLayerConfig
  | FloodInundationLayerConfig;

export interface LayerRenderContext<TLayerConfig extends LayerConfig = LayerConfig> {
  config: TLayerConfig;
  panelOptions: unknown;
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
