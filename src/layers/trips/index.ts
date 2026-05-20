import { TripsLayer } from '@deck.gl/geo-layers';
import type { Feature, LineString, MultiLineString } from 'geojson';
import type { SourceRef } from '../../types';
import type { BaseLayerConfig, LayerDefinition, LayerRenderContext } from '../types';
import { buildColorAccessor } from '../../utils/deckgl/colorScales';
import { createBaseLayerConfig, createSourceRef, section } from '../defaults';
import { createCommonLayerProps } from 'layers/utils';

export interface TripsLayerSettings {
  timestamps: SourceRef;
  timestampUnit: 'ms' | 's';
  trailLengthMs: number;
  fadeTrail: boolean;
  widthMinPixels: number;
  widthMaxPixels: number;
  width: SourceRef;
  widthScale: number;
  capRounded: boolean;
  jointRounded: boolean;
}

export type TripsLayerConfig = BaseLayerConfig<'trips', TripsLayerSettings>;

interface TripDatum {
  feature: Feature;
  path: number[][];
  timestamps: number[];
}

function getPath(feature: Feature): number[][] | null {
  const geometry = feature.geometry as LineString | MultiLineString | null;
  if (!geometry) {
    return null;
  }
  if (geometry.type === 'LineString') {
    return geometry.coordinates as number[][];
  }
  if (geometry.type === 'MultiLineString') {
    return geometry.coordinates[0] as number[][];
  }
  return null;
}

function parseTimestamps(raw: unknown): number[] {
  if (Array.isArray(raw)) {
    return raw.map(Number).filter(Number.isFinite);
  }
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (!trimmed) {
      return [];
    }
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed.map(Number).filter(Number.isFinite);
      }
    } catch {
      return trimmed.split(',').map((value) => Number(value.trim())).filter(Number.isFinite);
    }
    return trimmed.split(',').map((value) => Number(value.trim())).filter(Number.isFinite);
  }
  return [];
}

function getTimestamps(feature: Feature, path: number[][], field: string, unit: 'ms' | 's') {
  const timestamps = field
    ? parseTimestamps(feature.properties?.[field])
    : path.map((coordinate) => Number(coordinate[2])).filter(Number.isFinite);
  if (timestamps.length !== path.length) {
    return null;
  }
  return unit === 's' ? timestamps.map((value) => value * 1000) : timestamps;
}

function getTripData(features: Feature[], timeFilterFlags: Uint8Array, options: TripsLayerSettings) {
  const data: TripDatum[] = [];
  for (const feature of features as Array<Feature & { __idx?: number }>) {
    if (!timeFilterFlags[feature.__idx ?? -1]) {
      continue;
    }
    const path = getPath(feature);
    if (!path || path.length < 2) {
      continue;
    }
    const timestamps = getTimestamps(feature, path, options.timestamps.field, options.timestampUnit);
    if (!timestamps) {
      continue;
    }
    data.push({ feature, path, timestamps });
  }
  return data;
}

const defaultSettings: TripsLayerSettings = {
  timestamps: createSourceRef(),
  timestampUnit: 'ms',
  trailLengthMs: 300000,
  fadeTrail: true,
  widthMinPixels: 2,
  widthMaxPixels: 8,
  width: createSourceRef(),
  widthScale: 1,
  capRounded: true,
  jointRounded: true,
};

export const tripsLayerDefinition: LayerDefinition<TripsLayerConfig> = {
  type: 'trips',
  label: 'Trips',
  createDefaultConfig(index) {
    return createBaseLayerConfig('trips', 'Trips', index, defaultSettings);
  },
  editorSections: [
    section('Trip time', [
      { key: 'timestamps', label: 'Timestamps field', type: 'fieldPicker', defaultValue: createSourceRef() },
      {
        key: 'timestampUnit',
        label: 'Timestamp unit',
        type: 'select',
        defaultValue: 'ms',
        selectOptions: [
          { label: 'Milliseconds', value: 'ms' },
          { label: 'Seconds', value: 's' },
        ],
      },
      { key: 'trailLengthMs', label: 'Trail length (ms)', type: 'number', defaultValue: 300000 },
      { key: 'fadeTrail', label: 'Fade trail', type: 'boolean', defaultValue: true },
    ]),
    section('Path', [
      { key: 'widthMinPixels', label: 'Min width (px)', type: 'number', defaultValue: 2 },
      { key: 'widthMaxPixels', label: 'Max width (px)', type: 'number', defaultValue: 8 },
      { key: 'width', label: 'Width field', type: 'fieldPicker', defaultValue: createSourceRef() },
      { key: 'widthScale', label: 'Width scale', type: 'number', defaultValue: 1 },
      { key: 'capRounded', label: 'Rounded caps', type: 'boolean', defaultValue: true },
      { key: 'jointRounded', label: 'Rounded joints', type: 'boolean', defaultValue: true },
    ]),
  ],
  renderLayers(context: LayerRenderContext<TripsLayerConfig>) {
    const { config, features, cursorTimeMs, timeFilterFlags, onFeatureClick, getAccessors } = context;
    const options = config.settings;
    const data = getTripData(features, timeFilterFlags, options);
    const [getColorValue] = config.colorScale?.field ? getAccessors.number(config.colorScale.field) : [undefined, []];
    const getColor = buildColorAccessor(config.colorScale, [0, 200, 180, 220], getColorValue);
    const [getWidth] = getAccessors.number(options.width, 1);
    const commonProps = createCommonLayerProps(context);
    return [
      new TripsLayer<TripDatum>({
        ...commonProps,
        data,
        currentTime: cursorTimeMs,
        trailLength: options.trailLengthMs,
        fadeTrail: options.fadeTrail,
        widthUnits: 'pixels',
        widthMinPixels: options.widthMinPixels,
        widthMaxPixels: options.widthMaxPixels,
        capRounded: options.capRounded,
        jointRounded: options.jointRounded,
        getPath: (datum: TripDatum) => datum.path as any,
        getTimestamps: (datum: TripDatum) => datum.timestamps,
        getColor: (datum: TripDatum, ctx: any) => getColor(datum.feature, ctx) as [number, number, number, number],
        getWidth: getWidth ? (datum: TripDatum, ctx: any) => getWidth(datum.feature, ctx) : 1,
        onClick: onFeatureClick ? (info: any) => info.object && onFeatureClick(info.object.feature, info) : undefined,
      } as any),
    ];
  },
};

export default tripsLayerDefinition;
