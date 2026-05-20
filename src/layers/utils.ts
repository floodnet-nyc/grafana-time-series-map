import type { AccessorContext, LayerExtension } from '@deck.gl/core';
import { DataFilterExtension } from '@deck.gl/extensions';
import type { Feature } from 'geojson';
import type { BaseLayerConfig, LayerRenderContext } from './types';
import type { SourceRef } from '../types';

type LayerFeature = Feature & { __idx: number };
type ElevationSettings = { elevation?: SourceRef; elevationScale?: number; depthTest?: boolean };

export const DEFAULT_SELECTED_COLOR: [number, number, number, number] = [255, 230, 60, 255];



export function getProperty<F extends Feature>(feature: F, field: string): any {
  const derived = (feature as Feature & { __derived?: Record<string, any> }).__derived;
  const properties = feature.properties;
  return derived && field in derived ? derived[field] : properties?.[field];
}



export function getNumericProperty(feature: Feature, field: string, defaultValue = 0): number {
  const value = Number(getProperty(feature, field) ?? defaultValue);
  return isNaN(value) ? defaultValue : value;
}

export function getLayerElevation(config: BaseLayerConfig<string, any>) {
  const settings = (config.settings ?? {}) as ElevationSettings;

  return {
    field: settings.elevation,
    scale: settings.elevationScale ?? 1,
    depthTest: settings.depthTest ?? false,
  };
}


export function createCommonLayerProps<TLayerConfig extends BaseLayerConfig<string, any>>({
  config,
  features,
  timeFilterFlags,
  onFeatureClick,
}: LayerRenderContext<TLayerConfig>) {
  return {
    config: config,
    id: `${config.type}/${config.id}`,
    data: features,
    visible: config.visible,
    opacity: config.opacity,
    pickable: config.pickable ?? true,
    minZoom: config.minZoom,
    maxZoom: config.maxZoom,

    // Feature Click Handler
    onClick: (
      onFeatureClick && (config.pickable ?? true) ? 
        (info: { object?: Feature }) => info.object && onFeatureClick(info.object, info) 
        : undefined
    ),

    // Time filter props
    getFilterValue: timeFilterFlags ? (f: LayerFeature) => (f.__idx === undefined || timeFilterFlags[f.__idx] ? 1 : -1) : undefined,
    filterRange: [1, 1] as [number, number],
    updateTriggers: {
      getFilterValue: [timeFilterFlags],
    },
    extensions: [
      timeFilterFlags ? new DataFilterExtension({ filterSize: 1 }) : undefined,
    ].filter(Boolean) as LayerExtension[],
    
    parameters: { 
      depthTest: getLayerElevation(config).depthTest
    },
  };
}


export function getFeatureLngLat(feature: Feature): [number, number] {
  const coords = (feature.geometry as { coordinates?: number[] } | null)?.coordinates;
  return coords ? [coords[0] ?? 0, coords[1] ?? 0] : [0, 0];
}

export function getFeaturePosition(feature: Feature, config: LayerRenderContext['config'], offset=0): [number, number, number] {
  const [lng, lat] = getFeatureLngLat(feature);
  const elevation = getLayerElevation(config);
  const z = elevation.field?.field && elevation.field.source === config.data.featureSource.id
    ? Number(getProperty(feature, elevation.field.field) ?? 0) * elevation.scale
    : 0;
  return [lng, lat, z + offset];
}

export function createSelectionState(
  selectedKey: string | null | undefined,
  keyField: SourceRef | undefined,
  featureSourceId = 'main'
) {
  const hasSelection = selectedKey != null && Boolean(keyField?.field) && keyField?.source === featureSourceId;
  const isSelected = hasSelection
    ? (feature: Feature, ctx: AccessorContext<Feature>) => hasSelection && String(getProperty(feature, keyField?.field ?? '')) === selectedKey
    : undefined;

  return { hasSelection, isSelected };
}

export function createSelectionColorAccessor(
  baseColor: (feature: Feature, ctx: AccessorContext<Feature>) => [number, number, number, number],
  isSelected?: (feature: Feature, ctx: AccessorContext<Feature>) => boolean,
  selectedColor: [number, number, number, number] = DEFAULT_SELECTED_COLOR,
) {
  return isSelected ? (feature: Feature, ctx: AccessorContext<Feature>) => (isSelected?.(feature, ctx) ? selectedColor : baseColor(feature, ctx)) : baseColor;
}

export function createLineSelectionAccessors(
  isSelected?: (feature: Feature, ctx: AccessorContext<Feature>) => boolean,
  selectedColor: [number, number, number, number] = DEFAULT_SELECTED_COLOR,
) {
  return {
    getLineColor: (feature: Feature, ctx: AccessorContext<Feature>): [number, number, number, number] =>
      isSelected?.(feature, ctx)
          ? selectedColor
        : ([200, 200, 240, 200] as [number, number, number, number]),
    getLineWidth: (feature: Feature, ctx: AccessorContext<Feature>) => (isSelected ? (isSelected?.(feature, ctx) ? 3 : 1) : 2),
  };
}
