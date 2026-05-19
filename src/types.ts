import type { MapViewState } from '@deck.gl/core';
import type { LayerConfig } from './layers/_all';
import type { WidgetConfig } from './widgets/_all';

export type DataSource =
  | { type: 'query' }
  // | { type: 'geojson-url'; url: string };

export interface SourceRef {
  source: string;
  field: string;
}

export type GeometrySource =
  | { type: 'none' }
  | { type: 'wkb'; value: SourceRef }
  | { type: 'wkt'; value: SourceRef }
  | { type: 'latlng'; lat: SourceRef; lng: SourceRef }
  | { type: 'geojson'; value: SourceRef };

export type TimeFilterMode = 'none' | 'window' | 'asof';

export interface TimeFilterConfig {
  mode: TimeFilterMode;
  time?: SourceRef;
  groupBy?: SourceRef;
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
  field?: SourceRef;
  schemeName?: string;
  scaleMin?: number;
  scaleMax?: number;
  invert?: boolean;
}

export interface ShaderConfig {
  enabled: boolean;
  value?: SourceRef;
  vsDecl?: string;
  vsFilterColor?: string;
}

export interface FieldMapping {
  fieldName: string;
  alias: string;
}

export interface FeatureSourceConfig {
  id: string;
  refId: string;
}

export interface JoinedSourceField {
  field: string;
  as?: string;
}

export interface JoinedSourceJoinConfig {
  type: 'keyed-asof';
  localKey: SourceRef;
  remoteKey: string;
  time: string;
  maxLagMs?: number;
}

export interface JoinedSourceConfig {
  id: string;
  refId: string;
  join: JoinedSourceJoinConfig;
  fields: JoinedSourceField[];
}

export interface LayerDataConfig {
  featureSource: FeatureSourceConfig;
  joinedSources?: JoinedSourceConfig[];
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


export type BasemapProvider = 'maplibre' | 'google';
export type MaplibreStyle =
  | 'carto-dark'
  | 'carto-dark-nolabels'
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
export type InitialViewFitDataSource = 'allLayers' | 'layer';
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

export interface SharedFullscreenControlOptions {
  position?: MapControlPosition;
}

export interface SharedMapControlSettings {
  navigation?: SharedNavigationControlOptions;
  fullscreen?: SharedFullscreenControlOptions;
}

export interface GoogleMapOptions {
  apiKey?: string;
  mapId?: string;
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
export type DeckLightColor = [number, number, number] | [number, number, number, number];

export interface DeckLightConfig {
  id: string;
  type: DeckLightType;
  color?: DeckLightColor;
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

export interface InitialViewFitDataOptions {
  source?: InitialViewFitDataSource;
  layerId?: string;
  padding?: number;
  maxZoom?: number;
}

export interface InitialViewOptions {
  mode: InitialViewMode;
  state: MapViewState;
  fitData?: InitialViewFitDataOptions;
  fitRequestId?: number;
}

export interface MapPanelOptions {
  basemap: {
    provider: BasemapProvider;
    maplibre: {
      mapStyle: MaplibreStyle;
      mapStyleUrl?: string;
      projection?: MaplibreProjection;
    };
    google: GoogleMapOptions;
    interactions?: MapInteractionOptions;
    controls?: MapControlOptions;
    controlSettings?: SharedMapControlSettings;
  };
  deck: {
    parameters: DeckRenderParametersOptions;
    lighting: DeckLightingOptions;
    interleaved: boolean;
    pickingRadius?: number;
  };
  initialView: InitialViewOptions;
  layers: LayerConfig[];
  widgets?: WidgetConfig[];
  time: {
    show: boolean;
    defaultSpeed: number;
    loop: boolean;
  };
  legend: {
    show: boolean;
    maxWidth?: number;
    maxHeight?: number;
  };
  tooltip: {
    show: boolean;
    template?: string;
  };
  popup: {
    show: boolean;
    template?: string;
  };
  sync: {
    publish: boolean;
    subscribe: boolean;
    selectionVariableName?: string;
  };
}
