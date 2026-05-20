import type { Layer } from '@deck.gl/core';
jest.mock('../../../layers', () => ({
  layerDefinitions: [],
}));
jest.mock('../../../extensions', () => ({
  layerExtensionDefinitions: [],
}));
import { renderPreparedLayers } from './renderSelectors';
import type { PreparedLayerState } from './preparedLayerSelectors';
import type { LayerConfig } from '../../../layers';
import type { MapPanelOptions } from '../../../types';
import { createSourceRef } from '../../../layers/defaults';
import type { ScatterplotLayerConfig } from '../../../layers/scatterplot';
import type { GetAccessorFunction, GetAccessorFunctions } from '../../../layers/types';
import type { GeoFeature } from '../toGeoJsonFeatures';
import { featureArrayToLayerTable } from '../layerTable';

function createLayerConfig(overrides: Partial<LayerConfig> = {}): LayerConfig {
  const base: ScatterplotLayerConfig = {
    id: 'layer-1',
    type: 'scatterplot',
    label: 'Layer 1',
    visible: true,
    data: { featureSource: { id: 'main', refId: '' } },
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
    timeFilter: { mode: 'none', time: createSourceRef('time') },
    opacity: 1,
  };
  return { ...base, ...overrides } as LayerConfig;
}

function createFeature(properties: Record<string, unknown>, id?: string, index = 0): GeoFeature {
  return {
    type: 'Feature',
    id,
    geometry: { type: 'Point', coordinates: [0, 0] },
    properties,
    __idx: index,
  };
}

function createOptions(overrides: Partial<MapPanelOptions> = {}): MapPanelOptions {
  return {
    basemap: { provider: 'maplibre', maplibre: { mapStyle: 'carto-dark' }, google: {} },
    deck: { parameters: {}, lighting: {}, interleaved: true },
    initialView: { mode: 'manual', state: { latitude: 0, longitude: 0, zoom: 1 } },
    layers: [],
    time: { show: false, defaultSpeed: 1, loop: false },
    legend: { show: true },
    tooltip: { show: true },
    popup: { show: true },
    sync: { publish: true, subscribe: true },
    ...overrides,
  };
}

function createAccessors(): Pick<PreparedLayerState, 'getAccessor' | 'getAccessors'> {
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
  return { getAccessor, getAccessors };
}

describe('renderSelectors', () => {
  it('renders prepared layers in order and skips hidden or unknown types', () => {
    const visibleConfig = createLayerConfig({ id: 'visible', type: 'scatterplot' });
    const hiddenConfig = createLayerConfig({ id: 'hidden', type: 'scatterplot', visible: false });
    const missingConfig = createLayerConfig({ id: 'missing', type: 'line' });
    const accessors = createAccessors();
    const visibleFeatures = [createFeature({ value: 1 }, undefined, 0)];
    const hiddenFeatures = [createFeature({ value: 2 }, undefined, 0)];
    const missingFeatures = [createFeature({ value: 3 }, undefined, 0)];
    const preparedLayerStates: PreparedLayerState[] = [
      { config: visibleConfig, table: featureArrayToLayerTable(visibleFeatures as any, 'main'), features: visibleFeatures as any, timeFilterFlags: new Uint8Array([1]), ...accessors },
      { config: hiddenConfig, table: featureArrayToLayerTable(hiddenFeatures as any, 'main'), features: hiddenFeatures as any, timeFilterFlags: new Uint8Array([1]), ...accessors },
      { config: missingConfig, table: featureArrayToLayerTable(missingFeatures as any, 'main'), features: missingFeatures as any, timeFilterFlags: new Uint8Array([1]), ...accessors },
    ];

    const renderer = {
      type: 'scatterplot',
      label: 'Known',
      createDefaultConfig: () => visibleConfig,
      editorSections: [],
      renderLayers: (ctx: any) => [{ id: `deck-${ctx.config.id}` } as Layer],
    };

    const rendered = renderPreparedLayers({
      preparedLayerStates,
      options: createOptions({ layers: [visibleConfig, hiddenConfig, missingConfig] }),
      cursorTimeMs: 1500,
      fromTimeMs: 1000,
      toTimeMs: 2000,
      selectedKey: 'sensor-1',
      getRenderer: (type) => (type === 'scatterplot' ? (renderer as any) : undefined),
    });

    expect(rendered).toEqual([{ id: 'deck-visible' }]);
  });
});
