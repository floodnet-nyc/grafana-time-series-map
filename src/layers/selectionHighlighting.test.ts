import type { Feature } from 'geojson';
import { createSourceRef } from './defaults';
import type { LayerRenderContext } from './types';
import { DEFAULT_SELECTED_COLOR } from './utils';
import { iconLayerDefinition } from './icon';
import { scatterplotLayerDefinition } from './scatterplot';
import { textLayerDefinition } from './text';
import { featureArrayToLayerTable } from '../utils/dataframe/layerTable';

jest.mock('@deck.gl/layers', () => ({
  ScatterplotLayer: class MockScatterplotLayer {
    props: Record<string, unknown>;
    constructor(props: Record<string, unknown>) {
      this.props = props;
    }
  },
  IconLayer: class MockIconLayer {
    props: Record<string, unknown>;
    constructor(props: Record<string, unknown>) {
      this.props = props;
    }
  },
  TextLayer: class MockTextLayer {
    props: Record<string, unknown>;
    constructor(props: Record<string, unknown>) {
      this.props = props;
    }
  },
}));

function createFeature(properties: Record<string, unknown>): Feature {
  return {
    type: 'Feature',
    geometry: {
      type: 'Point',
      coordinates: [-73.9, 40.7],
    },
    properties,
  };
}

function createBaseContext() {
  const selected = createFeature({ deployment_id: 'sensor-1', sensor_id: 'group-a', label: 'Selected' });
  const unselected = createFeature({ deployment_id: 'sensor-2', sensor_id: 'group-a', label: 'Other' });
  const features = [selected, unselected].map((feature, index) => ({ ...feature, __idx: index })) as Array<
    Feature & { __idx: number }
  >;
  const table = featureArrayToLayerTable(features as any);
  const data = features.map((feature) => ({ __idx: feature.__idx }));
  const resolveAccessor = (fieldName: string, defaultValue?: unknown) => (_datum: unknown, ctx: { index: number }) =>
    features[ctx.index].properties?.[fieldName] ?? defaultValue;
  const getAccessor = (fieldRef?: { field?: string }, defaultValue?: unknown) =>
    [
      typeof fieldRef?.field === 'string' ? resolveAccessor(fieldRef.field, defaultValue) : undefined,
      [fieldRef?.field ?? '', defaultValue],
    ] as const;
  const getAccessors = {
    number: (fieldRef?: { field?: string }, defaultValue = 0) => {
      const [accessor, deps] = getAccessor(fieldRef, defaultValue);
      return [
        accessor
          ? (datum: unknown, ctx: { index: number }) => {
              const value = accessor(datum, ctx);
              return typeof value === 'number' && Number.isFinite(value) ? value : defaultValue;
            }
          : undefined,
        deps,
      ] as const;
    },
    date: getAccessor,
    dateMs: (fieldRef?: { field?: string }, defaultValue = 0) => {
      const [accessor, deps] = getAccessor(fieldRef, defaultValue);
      return [
        accessor
          ? (datum: unknown, ctx: { index: number }) => {
              const value = accessor(datum, ctx);
              return typeof value === 'number' && Number.isFinite(value) ? value : defaultValue;
            }
          : undefined,
        deps,
      ] as const;
    },
    array: getAccessor,
    numericArray: getAccessor,
    geometry: (defaultValue = null) => [() => defaultValue, []] as const,
    pointPosition: (defaultValue: [number, number] = [0, 0]) => [() => defaultValue, []] as const,
    path: (defaultValue: number[][] = []) => [() => defaultValue, []] as const,
    polygon: (defaultValue: number[][][] = []) => [() => defaultValue, []] as const,
  };

  return {
    panelOptions: {} as any,
    features,
    data,
    table,
    cursorTimeMs: 0,
    fromTimeMs: 0,
    toTimeMs: 0,
    timeFilterFlags: new Uint8Array([1, 1]),
    selectedKey: 'sensor-1',
    getAccessor,
    getAccessors,
  };
}

describe('layer selection highlighting', () => {
  it('uses selectionKey for scatterplot selection styling', () => {
    const shared = createBaseContext();
    const [layer] = scatterplotLayerDefinition.renderLayers({
      ...shared,
      config: {
        id: 'scatter-1',
        type: 'scatterplot',
        label: 'Scatter',
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
        geometry: { type: 'latlng', lat: createSourceRef('lat'), lng: createSourceRef('lng') },
        timeFilter: { mode: 'none', time: createSourceRef(), groupBy: createSourceRef('sensor_id') },
        opacity: 1,
        selectionKey: createSourceRef('deployment_id'),
      },
    } as unknown as LayerRenderContext<any>);

    expect((layer as any).props.getLineColor(shared.data[0], { index: 0 })).toEqual(DEFAULT_SELECTED_COLOR);
    expect((layer as any).props.getLineColor(shared.data[1], { index: 1 })).toEqual([200, 200, 240, 60]);
  });

  it('uses selectionKey for icon selection styling', () => {
    const shared = createBaseContext();
    const [layer] = iconLayerDefinition.renderLayers({
      ...shared,
      config: {
        id: 'icon-1',
        type: 'icon',
        label: 'Icon',
        visible: true,
        data: { featureSource: { id: 'main', refId: '' } },
        settings: {
          fixedIcon: 'marker',
          icon: createSourceRef(),
          iconAtlasUrl: '',
          iconMappingUrl: '',
          elevation: createSourceRef(),
          elevationScale: 1,
          depthTest: false,
          sizeScale: 32,
          sizeMinPixels: 8,
          sizeMaxPixels: 64,
          size: createSourceRef(),
          billboard: true,
          alphaCutoff: 0.05,
        },
        geometry: { type: 'latlng', lat: createSourceRef('lat'), lng: createSourceRef('lng') },
        timeFilter: { mode: 'none', time: createSourceRef(), groupBy: createSourceRef('sensor_id') },
        opacity: 1,
        selectionKey: createSourceRef('deployment_id'),
      },
    } as unknown as LayerRenderContext<any>);

    expect((layer as any).props.getColor(shared.data[0], { index: 0 })).toEqual(DEFAULT_SELECTED_COLOR);
    expect((layer as any).props.getColor(shared.data[1], { index: 1 })).not.toEqual(DEFAULT_SELECTED_COLOR);
  });

  it('uses selectionKey for text selection styling', () => {
    const shared = createBaseContext();
    const [layer] = textLayerDefinition.renderLayers({
      ...shared,
      config: {
        id: 'text-1',
        type: 'text',
        label: 'Text',
        visible: true,
        data: { featureSource: { id: 'main', refId: '' } },
        settings: {
          text: createSourceRef('label'),
          fontSize: 14,
          sizeMinPixels: 6,
          sizeMaxPixels: 64,
          size: createSourceRef(),
          sizeScale: 1,
          elevation: createSourceRef(),
          elevationScale: 1,
          depthTest: false,
          fontFamily: 'Helvetica Neue, Verdana, Roboto, sans-serif',
          fontWeight: 'normal',
          anchor: 'middle',
          baseline: 'center',
          billboard: true,
          background: false,
          pixelOffsetX: 0,
          pixelOffsetY: 0,
          autoDecimals: false,
        },
        geometry: { type: 'latlng', lat: createSourceRef('lat'), lng: createSourceRef('lng') },
        timeFilter: { mode: 'none', time: createSourceRef(), groupBy: createSourceRef('sensor_id') },
        opacity: 1,
        selectionKey: createSourceRef('deployment_id'),
      },
    } as unknown as LayerRenderContext<any>);

    expect((layer as any).props.getColor(shared.data[0], { index: 0 })).toEqual(DEFAULT_SELECTED_COLOR);
    expect((layer as any).props.getColor(shared.data[1], { index: 1 })).not.toEqual(DEFAULT_SELECTED_COLOR);
  });
});
