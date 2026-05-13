import type { LayerExtension } from '@deck.gl/core';
import { DataFilterExtension } from '@deck.gl/extensions';
import type { Feature } from 'geojson';
import type { LayerRenderContext } from './types';
import type { LayerConfig } from '../types';

type LayerFeature = Feature & { __idx: number };

const DEFAULT_SELECTED_COLOR: [number, number, number, number] = [255, 230, 60, 255];


export function getNumericProperty(feature: Feature, field: string, defaultValue = 0): number {
  const value = Number(feature.properties?.[String(field)] ?? defaultValue);
  return isNaN(value) ? defaultValue : value;
}


export function createCommonLayerProps<TLayerConfig extends LayerConfig>({
  config,
  features,
  timeFilterFlags,
  onFeatureClick,
}: LayerRenderContext<TLayerConfig>) {
  return {
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

export function getFeaturePosition(feature: Feature, config: LayerRenderContext['config']): [number, number, number] {
  const [lng, lat] = getFeatureLngLat(feature);
  const z = config.elevation?.field
    ? Number(feature.properties?.[config.elevation.field] ?? 0) * (config.elevation.scale ?? 1)
    : 0;
  return [lng, lat, z];
}

export function createSelectionState(selectedKey: string | null | undefined, keyField: string | undefined) {
  const hasSelection = selectedKey != null && Boolean(keyField);
  const isSelected = (feature: Feature) => hasSelection && String(feature.properties?.[keyField ?? '']) === selectedKey;

  return { hasSelection, isSelected };
}

export function createSelectionColorAccessor(
  baseColor: (feature: Feature) => [number, number, number, number],
  selectionState: ReturnType<typeof createSelectionState>,
  selectedColor: [number, number, number, number] = DEFAULT_SELECTED_COLOR,
) {
  return selectionState.hasSelection ? (feature: Feature) => (selectionState.isSelected(feature) ? selectedColor : baseColor(feature)) : baseColor;
}

export function createLineSelectionAccessors(selectionState: ReturnType<typeof createSelectionState>) {
  return {
    getLineColor: (feature: Feature): [number, number, number, number] =>
      selectionState.hasSelection
        ? selectionState.isSelected(feature)
          ? DEFAULT_SELECTED_COLOR
          : ([200, 200, 240, 60] as [number, number, number, number])
        : ([200, 200, 240, 200] as [number, number, number, number]),
    getLineWidth: (feature: Feature) => (selectionState.hasSelection ? (selectionState.isSelected(feature) ? 3 : 1) : 2),
  };
}

export function createSourcePositionAccessor(options: Record<string, any>) {
  return (feature: Feature): [number, number] => {
    if (options.srcLngField && options.srcLatField) {
      return [
        getNumericProperty(feature, options.srcLngField),
        getNumericProperty(feature, options.srcLatField),
      ];
    }

    return getFeatureLngLat(feature);
  };
}

export function createTargetPositionAccessor(options: Record<string, any>) {
  return (feature: Feature): [number, number] => {
    if (options.tgtLngField && options.tgtLatField) {
      return [
        getNumericProperty(feature, options.tgtLngField),
        getNumericProperty(feature, options.tgtLatField),
      ];
    }

    return [0, 0];
  };
}
