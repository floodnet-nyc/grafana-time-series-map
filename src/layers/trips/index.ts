import { TripsLayer } from '@deck.gl/geo-layers';
import type { Feature, LineString, MultiLineString } from 'geojson';
import type { BaseLayerConfig, LayerDefinition, LayerRenderContext } from '../types';

export interface TripsLayerSettings {
  timestampsField: string;
  timestampUnit: 'ms' | 's';
  trailLengthMs: number;
  fadeTrail: boolean;
  widthMinPixels: number;
  widthMaxPixels: number;
  widthField: string;
  widthScale: number;
  capRounded: boolean;
  jointRounded: boolean;
}

export type TripsLayerConfig = BaseLayerConfig<'trips', TripsLayerSettings>;
import { buildColorAccessor } from '../../utils/deckgl/colorScales';
import { createBaseLayerConfig, section } from '../defaults';

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
    const timestamps = getTimestamps(feature, path, options.timestampsField, options.timestampUnit);
    if (!timestamps) {
      continue;
    }
    data.push({ feature, path, timestamps });
  }
  return data;
}

const defaultSettings: TripsLayerSettings = {
  timestampsField: '',
  timestampUnit: 'ms',
  trailLengthMs: 300000,
  fadeTrail: true,
  widthMinPixels: 2,
  widthMaxPixels: 8,
  widthField: '',
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
      { key: 'timestampsField', label: 'Timestamps field', type: 'fieldPicker', defaultValue: '' },
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
      { key: 'widthField', label: 'Width field', type: 'fieldPicker', defaultValue: '' },
      { key: 'widthScale', label: 'Width scale', type: 'number', defaultValue: 1 },
      { key: 'capRounded', label: 'Rounded caps', type: 'boolean', defaultValue: true },
      { key: 'jointRounded', label: 'Rounded joints', type: 'boolean', defaultValue: true },
    ]),
  ],
  renderLayers({ config, features, cursorTimeMs, timeFilterFlags, onFeatureClick }: LayerRenderContext<TripsLayerConfig>) {
    const options = config.settings;
    const data = getTripData(features, timeFilterFlags, options);
    const getColor = buildColorAccessor(config.colorScale, [0, 200, 180, 220]);
    return [
      new TripsLayer<TripDatum>({
        id: `trips/${config.id}`,
        data,
        visible: config.visible,
        opacity: config.opacity,
        pickable: config.pickable ?? true,
        minZoom: config.minZoom,
        maxZoom: config.maxZoom,
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
        getColor: (datum: TripDatum) => getColor(datum.feature) as [number, number, number, number],
        getWidth: (datum: TripDatum) => (options.widthField ? Number(datum.feature.properties?.[options.widthField] ?? 1) * options.widthScale : 1),
        onClick: onFeatureClick ? (info: any) => info.object && onFeatureClick(info.object.feature, info) : undefined,
        parameters: { blend: true, depthTest: config.elevation?.depthTest ?? false } as any,
      } as any),
    ];
  },
};

export default tripsLayerDefinition;
