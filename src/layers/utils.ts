import type { LayerExtension } from '@deck.gl/core';
import { DataFilterExtension } from '@deck.gl/extensions';
import type { Feature } from 'geojson';
import type { BaseLayerConfig, LayerRenderContext } from './types';

type LayerFeature = Feature & { __idx: number };

const DEFAULT_SELECTED_COLOR: [number, number, number, number] = [255, 230, 60, 255];



export function getProperty<F extends Feature>(
    feature: F, 
    field: string
  ): any {
  const derived = (feature as Feature & { __derived?: Record<string, any> }).__derived;
  const properties = feature.properties;
  return derived && field in derived ? derived[field] : properties?.[field];
}



export function getNumericProperty(feature: Feature, field: string, defaultValue = 0): number {
  const value = Number(getProperty(feature, field) ?? defaultValue);
  return isNaN(value) ? defaultValue : value;
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
      depthTest: config.elevation?.depthTest ?? false
    },
  };
}


export function getFeatureLngLat(feature: Feature): [number, number] {
  const coords = (feature.geometry as { coordinates?: number[] } | null)?.coordinates;
  return coords ? [coords[0] ?? 0, coords[1] ?? 0] : [0, 0];
}

export function getFeaturePosition(feature: Feature, config: LayerRenderContext['config'], offset=0): [number, number, number] {
  const [lng, lat] = getFeatureLngLat(feature);
  const z = config.elevation?.field
    ? Number(getProperty(feature, config.elevation.field) ?? 0) * (config.elevation.scale ?? 1)
    : 0;
  return [lng, lat, z + offset];
}

export function createSelectionState(selectedKey: string | null | undefined, keyField: string | undefined) {
  const hasSelection = selectedKey != null && Boolean(keyField);
  const isSelected = hasSelection ? (feature: Feature) => hasSelection && String(getProperty(feature, keyField ?? '')) === selectedKey : undefined;

  return { hasSelection, isSelected };
}

export function createSelectionColorAccessor(
  baseColor: (feature: Feature) => [number, number, number, number],
  selectionState: ReturnType<typeof createSelectionState>,
  selectedColor: [number, number, number, number] = DEFAULT_SELECTED_COLOR,
) {
  return selectionState.isSelected ? (feature: Feature, ctx) => (selectionState.isSelected(feature, ctx) ? selectedColor : baseColor(feature)) : baseColor;
}

export function createLineSelectionAccessors(selectionState: ReturnType<typeof createSelectionState>) {
  return {
    getLineColor: (feature: Feature, ctx): [number, number, number, number] =>
      selectionState.isSelected
        ? selectionState.isSelected(feature, ctx)
          ? DEFAULT_SELECTED_COLOR
          : ([200, 200, 240, 60] as [number, number, number, number])
        : ([200, 200, 240, 200] as [number, number, number, number]),
    getLineWidth: (feature: Feature, ctx) => (selectionState.isSelected ? (selectionState.isSelected(feature, ctx) ? 3 : 1) : 2),
  };
}
