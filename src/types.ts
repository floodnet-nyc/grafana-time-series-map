export type GeometrySource =
  | { type: 'none' }
  | { type: 'wkb'; field: string }
  | { type: 'wkt'; field: string }
  | { type: 'latlng'; latField: string; lngField: string }
  | { type: 'geojson'; field: string };

export type TimeFilterMode = 'none' | 'window' | 'asof';

export interface TimeFilterConfig {
  mode: TimeFilterMode;
  timeField: string;
  groupByField?: string;
  maxLagMs?: number;
  windowToleranceMs?: number;
}

export interface ElevationConfig {
  field: string;
  scale: number;
  depthTest: boolean;
}

export type ColorScaleType = 'fixed' | 'steps' | 'gradient' | 'category';

export interface ColorStep {
  value: number;
  color: [number, number, number, number];
}

export interface ColorScaleConfig {
  type: ColorScaleType;
  fixedColor?: [number, number, number, number];
  steps?: ColorStep[];
  field?: string;
  presetName?: string;
  schemeName?: string;
  scaleMin?: number;
  scaleMax?: number;
  invert?: boolean;
}

export interface ShaderConfig {
  enabled: boolean;
  valueField: string;
  vsDecl?: string;
  vsFilterColor?: string;
}

export interface FieldMapping {
  fieldName: string;
  alias: string;
}

export interface LookupField {
  sourceField: string;
  as: string;
}

export interface LookupConfig {
  queryRefId: string;
  keyField: string;
  timeField: string;
  maxLagMs?: number;
  fields: LookupField[];
}

export interface LayerConfig {
  id: string;
  type: string;
  lookup?: LookupConfig;
  label: string;
  visible: boolean;
  queryRefId?: string;
  geometry: GeometrySource;
  elevation?: ElevationConfig;
  timeFilter: TimeFilterConfig;
  fieldMappings: FieldMapping[];
  opacity: number;
  colorScale?: ColorScaleConfig;
  minZoom?: number;
  maxZoom?: number;
  pickable?: boolean;
  shader?: ShaderConfig;
  options: Record<string, unknown>;
}

export type BasemapProvider = 'maplibre' | 'google';
export type MaplibreStyle = 'carto-dark' | 'carto-light' | 'osm' | 'custom';

export interface MapPanelOptions {
  basemapProvider: BasemapProvider;
  maplibreStyle: MaplibreStyle;
  maplibreStyleUrl?: string;
  googleMapsApiKey?: string;
  googleMapsMapId?: string;
  initialLatitude: number;
  initialLongitude: number;
  initialZoom: number;
  layers: LayerConfig[];
  defaultPlaybackSpeed: number;
  loopPlayback: boolean;
  showTimeControls: boolean;
  showLegend: boolean;
  syncPublish: boolean;
  syncSubscribe: boolean;
}
