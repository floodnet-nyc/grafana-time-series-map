import { HexagonLayer } from '@deck.gl/aggregation-layers';
import type { Feature, Point } from 'geojson';
import type { SourceRef } from '../../types';
import type { BaseLayerConfig, LayerDefinition, LayerRenderContext } from '../types';
import { createBaseLayerConfig, createSourceRef, section } from '../defaults';
import { createCommonLayerProps } from 'layers/utils';

export interface HexagonLayerSettings {
  radius: number;
  coverage: number;
  extruded: boolean;
  elevationScale: number;
  elevationWeight: SourceRef;
  elevationAggregation: 'SUM' | 'MEAN' | 'MIN' | 'MAX';
  colorWeight: SourceRef;
  colorAggregation: 'SUM' | 'MEAN' | 'MIN' | 'MAX';
  colorRange: string;
  lowerPercentile: number;
  upperPercentile: number;
}

export type HexagonLayerConfig = BaseLayerConfig<'hexagon', HexagonLayerSettings>;

const COLOR_RANGES: Record<string, Array<[number, number, number]>> = {
  teal: [[214, 245, 238], [153, 225, 210], [87, 197, 174], [24, 161, 135], [0, 124, 101], [0, 84, 70]],
  blueRed: [[49, 130, 189], [107, 174, 214], [158, 202, 225], [254, 178, 76], [240, 59, 32], [189, 0, 38]],
  accidents: [[1, 152, 189], [73, 227, 206], [216, 254, 181], [254, 237, 177], [254, 173, 84], [209, 55, 78]],
  viridis: [[68, 1, 84], [59, 82, 139], [33, 145, 140], [94, 201, 98], [253, 231, 37]],
};

const defaultSettings: HexagonLayerSettings = {
  radius: 250,
  coverage: 0.9,
  extruded: true,
  elevationScale: 50,
  elevationWeight: createSourceRef(),
  elevationAggregation: 'SUM',
  colorWeight: createSourceRef(),
  colorAggregation: 'SUM',
  colorRange: 'teal',
  lowerPercentile: 0,
  upperPercentile: 100,
};

export const hexagonLayerDefinition: LayerDefinition<HexagonLayerConfig> = {
  type: 'hexagon',
  label: 'Hexagon',
  createDefaultConfig(index) {
    return createBaseLayerConfig('hexagon', 'Hexagon', index, defaultSettings);
  },
  editorSections: [
    section('Hexagon', [
      { key: 'radius', label: 'Radius (m)', type: 'number', defaultValue: 250 },
      { key: 'coverage', label: 'Coverage (0-1)', type: 'number', defaultValue: 0.9 },
    ]),
    section('Elevation', [
      { key: 'extruded', label: 'Extruded', type: 'boolean', defaultValue: true },
      { key: 'elevationScale', label: 'Elevation scale', type: 'number', defaultValue: 50 },
      { key: 'elevationWeight', label: 'Elevation weight field', type: 'fieldPicker', defaultValue: createSourceRef() },
      {
        key: 'elevationAggregation',
        label: 'Elevation aggregation',
        type: 'select',
        defaultValue: 'SUM',
        selectOptions: [
          { label: 'Sum', value: 'SUM' },
          { label: 'Mean', value: 'MEAN' },
          { label: 'Min', value: 'MIN' },
          { label: 'Max', value: 'MAX' },
        ],
      },
    ]),
    section('Color', [
      { key: 'colorWeight', label: 'Color weight field', type: 'fieldPicker', defaultValue: createSourceRef() },
      {
        key: 'colorAggregation',
        label: 'Color aggregation',
        type: 'select',
        defaultValue: 'SUM',
        selectOptions: [
          { label: 'Sum', value: 'SUM' },
          { label: 'Mean', value: 'MEAN' },
          { label: 'Min', value: 'MIN' },
          { label: 'Max', value: 'MAX' },
        ],
      },
      {
        key: 'colorRange',
        label: 'Color preset',
        type: 'select',
        defaultValue: 'teal',
        selectOptions: [
          { label: 'Teal', value: 'teal' },
          { label: 'Blue to red', value: 'blueRed' },
          { label: 'Accidents', value: 'accidents' },
          { label: 'Viridis-like', value: 'viridis' },
        ],
      },
    ]),
    section('Filtering', [
      { key: 'lowerPercentile', label: 'Lower percentile', type: 'number', defaultValue: 0 },
      { key: 'upperPercentile', label: 'Upper percentile', type: 'number', defaultValue: 100 },
    ]),
  ],
  renderLayers(ctx: LayerRenderContext<HexagonLayerConfig>) {
    const { features, getNumericAccessor } = ctx;
    const options = ctx.config.settings;
    const commonProps = createCommonLayerProps(ctx);
    const colorRange = COLOR_RANGES[options.colorRange] ?? COLOR_RANGES.teal;
    const [getColorWeight, updatesColorWeight] = getNumericAccessor(options.colorWeight, 1);
    const [getElevationWeight, updatesElevationWeight] = getNumericAccessor(options.elevationWeight, 1);

    return [
      new HexagonLayer({
        ...commonProps,
        data: features,
        radius: options.radius,
        coverage: options.coverage,
        extruded: options.extruded,
        elevationScale: options.elevationScale,
        elevationAggregation: options.elevationAggregation,
        colorAggregation: options.colorAggregation,
        colorRange,
        lowerPercentile: options.lowerPercentile,
        upperPercentile: options.upperPercentile,
        getPosition: (feature: Feature) => (feature.geometry as Point).coordinates as [number, number],
        getColorWeight: getColorWeight ?? 1,
        getElevationWeight: getElevationWeight ?? 1,
        updateTriggers: {
          getColorWeight: updatesColorWeight,
          getElevationWeight: updatesElevationWeight,
        },
      } as any),
    ];
  },
};

export default hexagonLayerDefinition;
