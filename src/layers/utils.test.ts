import type { Feature } from 'geojson';
import type { LayerConfig } from '.';
import { createSourceRef } from './defaults';
import type { ScatterplotLayerConfig } from './scatterplot';
import {
  createCommonLayerProps,
  createLineSelectionAccessors,
  createSelectionColorAccessor,
  createSelectionState,
  getFeaturePosition,
} from './utils';
import type { GetAccessorFunction, GetNumericAccessorFunction } from './types';

function createConfig(overrides: Partial<LayerConfig> = {}): LayerConfig {
  const base: ScatterplotLayerConfig = {
    id: 'layer-1',
    type: 'scatterplot',
    label: 'Layer',
    visible: true,
    settings: {
      radiusMinPixels: 4,
      radiusMaxPixels: 20,
      radius: createSourceRef(),
      radiusScale: 1,
      elevation: createSourceRef(),
      elevationScale: 1,
      depthTest: false,
      stroked: true,
      showLabels: false,
      label: createSourceRef(),
    },
    geometry: { type: 'none' },
    timeFilter: { mode: 'none', time: createSourceRef(), groupBy: createSourceRef('sensor_id') },
    opacity: 1,
    data: { featureSource: { id: 'main', refId: '' } },
  };
  return { ...base, ...overrides } as LayerConfig;
}

function createPointFeature(properties: Record<string, unknown> = {}): Feature {
  return {
    type: 'Feature',
    geometry: {
      type: 'Point',
      coordinates: [-73.9, 40.7],
    },
    properties,
  };
}

function createContext(overrides: Partial<Parameters<typeof createCommonLayerProps>[0]> = {}) {
  const getAccessor: GetAccessorFunction = (fieldName, defaultValue) => [
    fieldName?.field ? (feature) => feature.properties?.[fieldName.field] ?? defaultValue : undefined,
    [fieldName?.source, fieldName?.field, defaultValue],
  ];
  const getNumericAccessor: GetNumericAccessorFunction = (fieldName, defaultValue = 0) => {
    const [accessor, deps] = getAccessor(fieldName, defaultValue);
    return [
      accessor
        ? (feature, ctx) => {
            const value = accessor(feature, ctx);
            return typeof value === 'number' && Number.isFinite(value) ? value : defaultValue;
          }
        : undefined,
      deps,
    ];
  };

  return {
    config: createConfig(),
    panelOptions: {} as any,
    features: [createPointFeature()],
    cursorTimeMs: 0,
    fromTimeMs: 0,
    toTimeMs: 0,
    timeFilterFlags: new Uint8Array([1]),
    selectedKey: null,
    getAccessor,
    getNumericAccessor,
    ...overrides,
  };
}

describe('layer utils', () => {
  it('computes elevated positions from feature geometry', () => {
    const config = createConfig({
      settings: {
        ...createConfig().settings,
        elevation: createSourceRef('depth'),
        elevationScale: 2,
        depthTest: false,
      },
    } as any);

    expect(getFeaturePosition(createPointFeature({ depth: 3 }), config)).toEqual([-73.9, 40.7, 6]);
  });

  it('builds selection-aware color and line accessors', () => {
    const selected = createPointFeature({ sensor_id: 'a' });
    const unselected = createPointFeature({ sensor_id: 'b' });
    const selectionState = createSelectionState('a', createSourceRef('sensor_id'));
    const baseColor = () => [10, 20, 30, 255] as [number, number, number, number];
    const ctx = { index: 0, data: [selected, unselected], target: [] };

    const colorAccessor = createSelectionColorAccessor(baseColor, selectionState.isSelected);
    const lineAccessors = createLineSelectionAccessors(selectionState.isSelected);

    expect(colorAccessor(selected, ctx)).toEqual([255, 230, 60, 255]);
    expect(colorAccessor(unselected, ctx)).toEqual([10, 20, 30, 255]);
    expect(lineAccessors.getLineColor(selected, ctx)).toEqual([255, 230, 60, 255]);
    expect(lineAccessors.getLineColor(unselected, ctx)).toEqual([200, 200, 240, 200]);
    expect(lineAccessors.getLineWidth(selected, ctx)).toBe(3);
    expect(lineAccessors.getLineWidth(unselected, ctx)).toBe(1);
  });

  it('builds common layer props with click and filter wiring', () => {
    const clicked: Feature[] = [];
    const feature = Object.assign(createPointFeature(), { __idx: 1 });
    const context = createContext({
      timeFilterFlags: new Uint8Array([0, 1, 0]),
      onFeatureClick: (clickedFeature) => clicked.push(clickedFeature),
    });

    const commonProps = createCommonLayerProps(context);

    expect(commonProps.visible).toBe(true);
    expect(commonProps.pickable).toBe(true);
    expect(commonProps.getFilterValue?.(feature as Feature & { __idx: number })).toBe(1);

    commonProps.onClick?.({ object: feature });

    expect(clicked).toEqual([feature]);
  });

  it('omits filter extensions and click handling when context does not need them', () => {
    const context = createContext({
      config: createConfig({ pickable: false }),
      timeFilterFlags: undefined as any,
      onFeatureClick: undefined,
    });

    const commonProps = createCommonLayerProps(context);

    expect(commonProps.onClick).toBeUndefined();
    expect(commonProps.getFilterValue).toBeUndefined();
    expect(commonProps.extensions).toEqual([]);
  });
});
