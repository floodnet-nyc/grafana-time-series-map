import { renderHook } from '@testing-library/react';
import type { Feature } from 'geojson';
import type { InitialViewFitDataSource, MapPanelOptions } from '../types';
import { useFitBounds } from './useFitBounds';
import type { PreparedLayerState } from '../utils/dataframe/panelLayersModel';
import type { GetAccessorFunction, GetNumericAccessorFunction } from '../layers/types';

function createOptions(): MapPanelOptions {
  return {
    basemap: { provider: 'maplibre', maplibre: { mapStyle: 'carto-dark' }, google: {} },
    deck: { parameters: {}, lighting: {}, interleaved: true },
    initialView: {
      mode: 'fitData',
      state: { latitude: 0, longitude: 0, zoom: 1, bearing: 0, pitch: 0 },
      fitData: { source: 'allLayers', padding: 48, maxZoom: 22 },
    },
    layers: [],
    time: { show: false, defaultSpeed: 1, loop: false },
    legend: { show: false },
    tooltip: { show: true },
    popup: { show: true },
    sync: { publish: true, subscribe: true },
  };
}

function pointFeature(longitude: number, latitude: number): Feature {
  return {
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [longitude, latitude] },
    properties: {},
  };
}

const getAccessor: GetAccessorFunction = (fieldName, defaultValue) => [
  fieldName ? (feature) => feature.properties?.[fieldName] ?? defaultValue : undefined,
  [fieldName, defaultValue],
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

function createPreparedLayerState(overrides: Partial<PreparedLayerState> = {}): PreparedLayerState {
  return {
    config: {
      id: 'layer-1',
      type: 'scatterplot',
      label: 'Layer 1',
      visible: true,
      settings: {},
      geometry: { type: 'geojson', field: 'geometry' },
      timeFilter: { mode: 'window', timeField: 'time' },
        opacity: 1,
    } as any,
    features: [pointFeature(-122, 37), pointFeature(-74, 40)],
    timeFilterFlags: new Uint8Array([0, 1]),
    getAccessor,
    getNumericAccessor,
    ...overrides,
  };
}

describe('useFitBounds', () => {
  it('fits all visible features for allLayers', () => {
    const options = createOptions();
    const preparedLayerStates = [createPreparedLayerState()];

    const { result } = renderHook(() => useFitBounds(options, preparedLayerStates));

    expect(result.current).toEqual([
      [-122, 37],
      [-74, 40],
    ]);
  });

  it('fits only the selected layer when source is layer', () => {
    const options = {
      ...createOptions(),
      initialView: {
        ...createOptions().initialView,
        fitData: { source: 'layer' as InitialViewFitDataSource, layerId: 'layer-2', padding: 48, maxZoom: 22 },
      },
    };
    const preparedLayerStates = [
      createPreparedLayerState(),
      createPreparedLayerState({
        config: {
          ...createPreparedLayerState().config,
          id: 'layer-2',
          label: 'Layer 2',
        },
        features: [pointFeature(10, 20), pointFeature(30, 40)],
        timeFilterFlags: new Uint8Array([0, 0]),
      }),
    ];

    const { result } = renderHook(() => useFitBounds(options, preparedLayerStates));

    expect(result.current).toEqual([
      [10, 20],
      [30, 40],
    ]);
  });

  it('returns undefined when fitData has no visible features to fit', () => {
    const options = createOptions();
    const preparedLayerStates = [
      createPreparedLayerState({
        features: [],
      }),
    ];

    const { result } = renderHook(() => useFitBounds(options, preparedLayerStates));

    expect(result.current).toBeUndefined();
  });
});
