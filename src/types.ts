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

export type ColorScaleType = 'fixed' | 'threshold' | 'gradient';

export interface ColorStep {
  value: number;
  color: [number, number, number, number]; // RGBA 0-255
}

export interface ColorScaleConfig {
  type: ColorScaleType;
  fixedColor?: [number, number, number, number];
  /** Sorted threshold steps for type='threshold'. The lowest step is the base color. */
  steps?: ColorStep[];
  field?: string;
  schemeName?: string; // d3 or custom interpolator name
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
  /** Whether this layer appears in the map legend. Defaults to true. */
  showInLegend?: boolean;
  /** Optional description shown as a tooltip in the legend. */
  description?: string;
  minZoom?: number;
  maxZoom?: number;
  pickable?: boolean;
  shader?: ShaderConfig;
  options: Record<string, unknown>;
}

export type BasemapProvider = 'maplibre' | 'google';
export type MaplibreStyle = 'carto-dark' | 'carto-light' | 'osm' | 'custom';
export type InitialViewMode = 'manual' | 'fitData';

export interface MapPanelOptions {
  basemapProvider: BasemapProvider;
  maplibreStyle: MaplibreStyle;
  maplibreStyleUrl?: string;
  googleMapsApiKey?: string;
  googleMapsMapId?: string;
  initialViewMode: InitialViewMode;
  initialLatitude: number;
  initialLongitude: number;
  initialZoom: number;
  initialBearing: number;
  initialPitch: number;
  layers: LayerConfig[];
  defaultPlaybackSpeed: number;
  loopPlayback: boolean;
  showTimeControls: boolean;
  showLegend: boolean;
  interleaved: boolean;
  syncPublish: boolean;
  syncSubscribe: boolean;
}
