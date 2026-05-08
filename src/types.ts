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
export type MaplibreProjection = 'mercator' | 'globe';
export type InitialViewMode = 'manual' | 'fitData';
export type GoogleMapColorScheme = 'LIGHT' | 'DARK' | 'FOLLOW_SYSTEM';
export type GoogleMapTypeControlStyle = 'DEFAULT' | 'DROPDOWN_MENU' | 'HORIZONTAL_BAR';
export type GoogleControlPosition =
  | 'BLOCK_START_INLINE_START'
  | 'BLOCK_START_INLINE_CENTER'
  | 'BLOCK_START_INLINE_END'
  | 'INLINE_START_BLOCK_START'
  | 'INLINE_START_BLOCK_CENTER'
  | 'INLINE_START_BLOCK_END'
  | 'INLINE_END_BLOCK_START'
  | 'INLINE_END_BLOCK_CENTER'
  | 'INLINE_END_BLOCK_END'
  | 'BLOCK_END_INLINE_START'
  | 'BLOCK_END_INLINE_CENTER'
  | 'BLOCK_END_INLINE_END'
  | 'TOP_LEFT'
  | 'TOP_CENTER'
  | 'TOP_RIGHT'
  | 'LEFT_TOP'
  | 'LEFT_CENTER'
  | 'LEFT_BOTTOM'
  | 'RIGHT_TOP'
  | 'RIGHT_CENTER'
  | 'RIGHT_BOTTOM'
  | 'BOTTOM_LEFT'
  | 'BOTTOM_CENTER'
  | 'BOTTOM_RIGHT';

export interface MapInteractionOptions {
  /** Toggle all map user gestures where supported. */
  interactive?: boolean;
  /** Require Ctrl/Cmd or two-finger gestures for scroll zoom and rotation. */
  cooperativeGestures?: boolean;
  /** Sync the map camera to URL hash parameter v=zoom/lat/lon. */
  syncViewToUrl?: boolean;
  /** MapLibre only: enable camera roll with Ctrl + drag. */
  rollEnabled?: boolean;
}

export interface MapControlOptions {
  /** MapLibre NavigationControl or Google camera control. */
  navigationControl?: boolean;
  geolocateControl?: boolean;
  fullscreenControl?: boolean;
  scaleControl?: boolean;
}

export interface MaplibreControlOptions {
  geolocateControl?: boolean;
  geolocateTrackUserLocation?: boolean;
  navigationShowZoom?: boolean;
  navigationShowCompass?: boolean;
  navigationVisualizePitch?: boolean;
  navigationVisualizeRoll?: boolean;
}

export interface GoogleMapOptions {
  colorScheme?: GoogleMapColorScheme;
  mapTypeControl?: boolean;
  streetViewControl?: boolean;
  rotateControl?: boolean;
  cameraControlPosition?: GoogleControlPosition;
  fullscreenControlPosition?: GoogleControlPosition;
  mapTypeControlPosition?: GoogleControlPosition;
  mapTypeControlStyle?: GoogleMapTypeControlStyle;
  streetViewControlPosition?: GoogleControlPosition;
  rotateControlPosition?: GoogleControlPosition;
}

export type DeckBlendOperation = 'add' | 'subtract' | 'reverse-subtract' | 'min' | 'max';
export type DeckBlendFactor =
  | 'zero'
  | 'one'
  | 'src'
  | 'one-minus-src'
  | 'src-alpha'
  | 'one-minus-src-alpha'
  | 'dst'
  | 'one-minus-dst'
  | 'dst-alpha'
  | 'one-minus-dst-alpha'
  | 'src-alpha-saturated'
  | 'constant'
  | 'one-minus-constant';
export type DeckDepthCompare = 'never' | 'less' | 'equal' | 'less-equal' | 'greater' | 'not-equal' | 'greater-equal' | 'always';

export interface DeckRenderParametersOptions {
  blend?: boolean;
  blendColorOperation?: DeckBlendOperation;
  blendColorSrcFactor?: DeckBlendFactor;
  blendColorDstFactor?: DeckBlendFactor;
  blendAlphaOperation?: DeckBlendOperation;
  blendAlphaSrcFactor?: DeckBlendFactor;
  blendAlphaDstFactor?: DeckBlendFactor;
  polygonOffsetFill?: boolean;
  depthWriteEnabled?: boolean;
  depthCompare?: DeckDepthCompare;
}

export interface MapPanelOptions {
  basemapProvider: BasemapProvider;
  maplibreStyle: MaplibreStyle;
  maplibreStyleUrl?: string;
  maplibreProjection?: MaplibreProjection;
  googleMapsApiKey?: string;
  googleMapsMapId?: string;
  interactions?: MapInteractionOptions;
  controls?: MapControlOptions;
  maplibreControls?: MaplibreControlOptions;
  googleMapOptions?: GoogleMapOptions;
  deckParameters?: DeckRenderParametersOptions;
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
