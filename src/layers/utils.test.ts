import type { Feature } from 'geojson';
import type { LayerConfig } from '.';
import { createSourceRef } from './defaults';
import type { ScatterplotLayerConfig } from './scatterplot';
import {
  createCommonLayerProps,
  getFeaturePosition,
} from './utils';
import type { GetAccessorFunction, GetAccessorFunctions } from './types';
import { featureArrayToLayerTable } from '../utils/dataframe/layerTable';

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
    fieldName?.field ? ((feature: any) => feature.properties?.[fieldName.field] ?? defaultValue) : undefined,
    [fieldName?.source, fieldName?.field, defaultValue],
  ];
  const getAccessors: GetAccessorFunctions = {
    number: (fieldRef, defaultValue = 0) => {
      const [accessor, deps] = getAccessor(fieldRef, defaultValue);
      return [
        accessor
          ? (feature, ctx) => {
              const value = accessor(feature, ctx);
              return typeof value === 'number' && Number.isFinite(value) ? value : defaultValue;
            }
          : undefined,
        deps,
      ];
    },
    date: getAccessor as any,
    dateMs: (fieldRef, defaultValue = 0) => {
      const [accessor, deps] = getAccessor(fieldRef, defaultValue);
      return [
        accessor
          ? (feature, ctx) => {
              const value = accessor(feature, ctx);
              return typeof value === 'number' && Number.isFinite(value) ? value : defaultValue;
            }
          : undefined,
        deps,
      ];
    },
    array: getAccessor as any,
    numericArray: getAccessor as any,
    geometry: () => [() => null, []],
    pointPosition: (defaultValue = [0, 0] as [number, number]) => [() => defaultValue, []],
    path: (defaultValue = [] as number[][]) => [() => defaultValue, []],
    polygon: (defaultValue = [] as number[][][]) => [() => defaultValue, []],
  };

  const features = [{ ...createPointFeature(), __idx: 0 }] as any;

  return {
    config: createConfig(),
    panelOptions: {} as any,
    data: [{ __idx: 0 }],
    table: featureArrayToLayerTable(features),
    features,
    cursorTimeMs: 0,
    fromTimeMs: 0,
    toTimeMs: 0,
    timeFilterFlags: new Uint8Array([1]),
    selectedKey: null,
    getAccessor,
    getAccessors,
    ...overrides,
  };
}

describe('layer utils', () => {
  it('computes elevated positions from feature geometry', () => {
    const feature = createPointFeature({ depth: 3 });

    // getFeaturePosition(feature, z?, offset?) — z is the elevation in meters
    expect(getFeaturePosition(feature, 6, 0)).toEqual([-73.9, 40.7, 6]);
    expect(getFeaturePosition(feature)).toEqual([-73.9, 40.7, 0]);
    expect(getFeaturePosition(feature, 5, 2)).toEqual([-73.9, 40.7, 7]);
  });

  it('builds common layer props with click and filter wiring', () => {
    const clicked: Feature[] = [];
    const context = createContext({
      timeFilterFlags: new Uint8Array([1]),
      onFeatureClick: (clickedFeature) => clicked.push(clickedFeature),
    });
    const feature = context.features?.[0] as Feature & { __idx: number };

    const commonProps = createCommonLayerProps(context);

    expect(commonProps.visible).toBe(true);
    expect(commonProps.pickable).toBe(true);
    expect(commonProps.getFilterValue?.(feature)).toBe(1);

    commonProps.onClick?.({ object: feature }, undefined);

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
