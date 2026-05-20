import type { Feature } from 'geojson';
import { createSourceRef } from '../defaults';
jest.mock('@deck.gl/layers', () => ({
  GeoJsonLayer: class GeoJsonLayer {
    props: any;
    constructor(props: any) {
      this.props = props;
    }
  },
}));

import { geoJsonLayerDefinition } from './index';
import type { GetAccessorFunction, GetAccessorFunctions, LayerRenderContext } from '../types';
import type { GeoJsonLayerConfig } from './index';

function createFeature(properties: Record<string, unknown> = {}): Feature {
  return {
    type: 'Feature',
    geometry: {
      type: 'LineString',
      coordinates: [
        [-73.9, 40.7],
        [-73.8, 40.8],
      ],
    },
    properties,
  };
}

function createConfig(overrides: Partial<GeoJsonLayerConfig> = {}): GeoJsonLayerConfig {
  return {
    id: 'geojson-1',
    type: 'geojson',
    label: 'GeoJSON 1',
    visible: true,
    data: { featureSource: { id: 'main', refId: '' } },
    geometry: { type: 'none' },
    timeFilter: { mode: 'none', time: createSourceRef() },
    opacity: 1,
    settings: {
      pointRadiusMinPixels: 4,
      pointRadiusMaxPixels: 20,
      lineWidthMinPixels: 1,
      lineWidth: createSourceRef(),
      lineWidthScale: 1,
      lineWidthUnits: 'pixels',
      filled: true,
      stroked: true,
      extruded: false,
    },
    ...overrides,
  };
}

function createContext(config: GeoJsonLayerConfig, features: Feature[]): LayerRenderContext<GeoJsonLayerConfig> {
  const getAccessor: GetAccessorFunction = (fieldName, defaultValue) => [
    fieldName?.field ? (feature) => feature.properties?.[fieldName.field] ?? defaultValue : undefined,
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
  };

  return {
    config,
    panelOptions: {} as any,
    features,
    cursorTimeMs: 0,
    fromTimeMs: 0,
    toTimeMs: 0,
    timeFilterFlags: new Uint8Array(features.map(() => 1)),
    getAccessor,
    getAccessors,
  };
}

describe('geoJsonLayerDefinition', () => {
  it('applies the color scale to both fill and stroke', () => {
    const feature = createFeature({ severity: 15 });
    const config = createConfig({
      colorScale: {
        type: 'threshold',
        field: createSourceRef('severity'),
        steps: [
          { value: 0, color: [0, 0, 255, 255] },
          { value: 10, color: [255, 0, 0, 255] },
        ],
      },
    });

    const [layer] = geoJsonLayerDefinition.renderLayers(createContext(config, [feature])) as any[];

    expect(layer.props.getFillColor(feature)).toEqual([255, 0, 0, 255]);
    expect(layer.props.getLineColor(feature)).toEqual([255, 0, 0, 255]);
  });

  it('supports data-driven line widths and units', () => {
    const feature = createFeature({ width_value: 12 });
    const config = createConfig({
      settings: {
        pointRadiusMinPixels: 4,
        pointRadiusMaxPixels: 20,
        lineWidthMinPixels: 0.5,
        lineWidth: createSourceRef('width_value'),
        lineWidthScale: 10,
        lineWidthUnits: 'meters',
        filled: false,
        stroked: true,
        extruded: false,
      },
    });

    const [layer] = geoJsonLayerDefinition.renderLayers(createContext(config, [feature])) as any[];

    expect(layer.props.lineWidthUnits).toBe('meters');
    expect(layer.props.lineWidthMinPixels).toBe(0.5);
    expect(layer.props.getLineWidth(feature, { index: 0, data: [feature], target: [] })).toBe(12);
  });
});
