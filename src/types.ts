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
  color: [number, number, number, number];
}

export interface ColorScaleConfig {
  type: ColorScaleType;
  fixedColor?: [number, number, number, number];
  steps?: ColorStep[];
  field?: string;
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

export interface LayerSecondarySourceField {
  sourceField: string;
  as: string;
}

export interface LayerSecondarySourceJoinConfig {
  type: 'keyed-asof';
  localKeyField: string;
  remoteKeyField: string;
  timeField: string;
  maxLagMs?: number;
}

export interface LayerSecondarySourceConfig {
  id: string;
  queryRefId: string;
  join: LayerSecondarySourceJoinConfig;
  fields: LayerSecondarySourceField[];
}

export interface LayerDerivedFieldConfig {
  as: string;
  expression: string;
  type?: 'number' | 'string' | 'boolean';
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
export type DeckDepthCompare =
  | 'never'
  | 'less'
  | 'equal'
  | 'less-equal'
  | 'greater'
  | 'not-equal'
  | 'greater-equal'
  | 'always';

export interface LayerBlendingConfig {
  enabled: boolean;
  blend: boolean;
  colorOperation: DeckBlendOperation;
  colorSrcFactor: DeckBlendFactor;
  colorDstFactor: DeckBlendFactor;
  alphaOperation: DeckBlendOperation;
  alphaSrcFactor: DeckBlendFactor;
  alphaDstFactor: DeckBlendFactor;
}

export interface LayerMaterialConfig {
  enabled: boolean;
  ambient: number;
  diffuse: number;
  shininess: number;
  specularColor: [number, number, number, number];
}

export interface LayerCollisionConfig {
  enabled: boolean;
  group: string;
  priorityField: string;
  priorityScale: number;
  priorityOffset: number;
  testScale: number;
}

export interface LayerExtensionsConfig {
  blending?: LayerBlendingConfig;
  material?: LayerMaterialConfig;
  collision?: LayerCollisionConfig;
}

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

export type BasemapProvider = 'maplibre' | 'google';
export type MaplibreStyle =
  | 'carto-dark'
  | 'carto-light'
  | 'carto-voyager'
  | 'osm'
  | 'versatiles-colorful'
  | 'versatiles-graybeard'
  | 'versatiles-eclipse'
  | 'versatiles-neutrino'
  | 'versatiles-shadow'
  | 'custom';
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

export type MapControlPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

export interface MapInteractionOptions {
  interactive?: boolean;
  cooperativeGestures?: boolean;
  syncViewToUrl?: boolean;
  rollEnabled?: boolean;
}

export interface MapControlOptions {
  navigationControl?: boolean;
  geolocateControl?: boolean;
  fullscreenControl?: boolean;
  scaleControl?: boolean;
}

export interface SharedNavigationControlOptions {
  position?: MapControlPosition;
  showZoom?: boolean;
  showCompass?: boolean;
  visualizePitch?: boolean;
  visualizeRoll?: boolean;
}

export interface SharedGeolocateControlOptions {
  position?: MapControlPosition;
  trackUserLocation?: boolean;
}

export interface SharedFullscreenControlOptions {
  position?: MapControlPosition;
}

export interface SharedMapControlSettings {
  navigation?: SharedNavigationControlOptions;
  geolocate?: SharedGeolocateControlOptions;
  fullscreen?: SharedFullscreenControlOptions;
}

export interface GoogleMapOptions {
  colorScheme?: GoogleMapColorScheme;
  mapTypeControl?: boolean;
  streetViewControl?: boolean;
  mapTypeControlPosition?: GoogleControlPosition;
  mapTypeControlStyle?: GoogleMapTypeControlStyle;
  streetViewControlPosition?: GoogleControlPosition;
}

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

export type DeckLightType = 'ambient' | 'point' | 'directional' | 'camera' | 'sun';

export interface DeckLightConfig {
  id: string;
  type: DeckLightType;
  color?: string;
  intensity?: number;
  longitude?: number;
  latitude?: number;
  altitude?: number;
  directionX?: number;
  directionY?: number;
  directionZ?: number;
  attenuationConstant?: number;
  attenuationLinear?: number;
  attenuationQuadratic?: number;
  timestamp?: number;
  shadow?: boolean;
}

export interface DeckLightingOptions {
  enabled?: boolean;
  lights?: DeckLightConfig[];
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
  controlSettings?: SharedMapControlSettings;
  googleMapOptions?: GoogleMapOptions;
  deckParameters?: DeckRenderParametersOptions;
  deckLighting?: DeckLightingOptions;
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
