import type { Feature } from 'geojson';
import type { LayerConfig } from '../types';
import {
  createCommonLayerProps,
  createLineSelectionAccessors,
  createSelectionColorAccessor,
  createSelectionState,
  createSourcePositionAccessor,
  createTargetPositionAccessor,
  getFeaturePosition,
} from './utils';

function createConfig(overrides: Partial<LayerConfig> = {}): LayerConfig {
  return {
    id: 'layer-1',
    type: 'scatterplot',
    label: 'Layer',
    visible: true,
    geometry: { type: 'none' },
    timeFilter: { mode: 'none', timeField: '', groupByField: 'sensor_id' },
    fieldMappings: [],
    opacity: 1,
    options: {},
    ...overrides,
  };
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
  return {
    config: createConfig(),
    options: {},
    panelOptions: {} as any,
    features: [createPointFeature()],
    cursorTimeMs: 0,
    fromTimeMs: 0,
    toTimeMs: 0,
    timeFilterFlags: new Uint8Array([1]),
    selectedKey: null,
    ...overrides,
  };
}

describe('layer utils', () => {
  it('computes elevated positions from feature geometry', () => {
    const config = createConfig({
      elevation: {
        field: 'depth',
        scale: 2,
        depthTest: false,
      },
    });

    expect(getFeaturePosition(createPointFeature({ depth: 3 }), config)).toEqual([-73.9, 40.7, 6]);
  });

  it('builds selection-aware color and line accessors', () => {
    const selected = createPointFeature({ sensor_id: 'a' });
    const unselected = createPointFeature({ sensor_id: 'b' });
    const selectionState = createSelectionState('a', 'sensor_id');
    const baseColor = () => [10, 20, 30, 255] as [number, number, number, number];

    const colorAccessor = createSelectionColorAccessor(baseColor, selectionState);
    const lineAccessors = createLineSelectionAccessors(selectionState);

    expect(colorAccessor(selected)).toEqual([255, 230, 60, 255]);
    expect(colorAccessor(unselected)).toEqual([10, 20, 30, 255]);
    expect(lineAccessors.getLineColor(selected)).toEqual([255, 230, 60, 255]);
    expect(lineAccessors.getLineColor(unselected)).toEqual([200, 200, 240, 60]);
    expect(lineAccessors.getLineWidth(selected)).toBe(3);
    expect(lineAccessors.getLineWidth(unselected)).toBe(1);
  });

  it('builds source and target position accessors from option fields', () => {
    const feature = createPointFeature({
      src_lng: -74.1,
      src_lat: 40.8,
      dst_lng: -73.8,
      dst_lat: 40.6,
    });

    const source = createSourcePositionAccessor({ srcLngField: 'src_lng', srcLatField: 'src_lat' });
    const target = createTargetPositionAccessor({ tgtLngField: 'dst_lng', tgtLatField: 'dst_lat' });

    expect(source(feature)).toEqual([-74.1, 40.8]);
    expect(target(feature)).toEqual([-73.8, 40.6]);
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
