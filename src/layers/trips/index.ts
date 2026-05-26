import { TripsLayer } from '@deck.gl/geo-layers';
import type { LineString, MultiLineString } from 'geojson';
import type { SourceRef } from '../../types';
import type { BaseLayerConfig, LayerDefinition, LayerRenderContext } from '../types';
import { buildColorAccessor } from '../../utils/deckgl/colorScales';
import { createBaseLayerConfig, createSourceRef, section } from '../defaults';
import { createCommonLayerProps } from 'layers/utils';
import { getRowGeometry, type LayerDatum } from '../../utils/dataframe/layerTable';
import type { AccessorContext } from '@deck.gl/core';

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
type TripDatum = LayerDatum;

function getPath(geometry: unknown): number[][] {
  const pathGeometry = geometry as LineString | MultiLineString | null;
  if (!pathGeometry) {
    return [];
  }
  if (pathGeometry.type === 'LineString') {
    return pathGeometry.coordinates as number[][];
  }
  if (pathGeometry.type === 'MultiLineString') {
    return (pathGeometry.coordinates[0] ?? []) as number[][];
  }
  return [];
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

export const tripsLayerDefinition: LayerDefinition<TripsLayerConfig, TripDatum> = {
  type: 'trips',
  label: 'Trips',
  createDefaultConfig(index) {
    return createBaseLayerConfig('trips', 'Trips', index, defaultSettings);
  },
  editorSections: [
    section('Trip time', [
      { key: 'timestamps', label: 'Timestamps field', type: 'fieldPicker', defaultValue: createSourceRef() },
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
    const { config, data, cursorTimeMs, timeFilterFlags, getAccessors } = context;
    const options = config.settings;
    const commonProps = createCommonLayerProps(context);
    const [getColorValue, updatesColorValue] = config.colorScale?.field
      ? getAccessors.number(config.colorScale.field)
      : [undefined, []];
    const getColor = buildColorAccessor<TripDatum>(config.colorScale, [0, 200, 180, 220], getColorValue);
    const [getWidth, updatesWidth] = getAccessors.number(options.width, 1);
    const [getTimestampsRaw, updatesTimestamps] = getAccessors.numericArray(options.timestamps);
    const getIndex = (datum: TripDatum, ctx?: AccessorContext<TripDatum>) => ctx?.index ?? datum.__idx ?? -1;
    const getContext = (datum: TripDatum, ctx?: AccessorContext<TripDatum>) =>
      ctx ?? ({ index: getIndex(datum, ctx) } as AccessorContext<TripDatum>);
    const getPathAccessor = (datum: TripDatum, ctx?: AccessorContext<TripDatum>) => {
      const path = getPath(getRowGeometry(context.table, getIndex(datum, ctx)));
      return path.length >= 2 ? path : [];
    };
    const getTimestamps = getTimestampsRaw
      ? (datum: TripDatum, ctx: AccessorContext<TripDatum>) => {
          const timestamps = getTimestampsRaw(datum, ctx);
          const path = getPathAccessor(datum, ctx);
          return timestamps.length === path.length ? timestamps : [];
        }
      : (datum: TripDatum, ctx: AccessorContext<TripDatum>) => {
          const path = getPathAccessor(datum, ctx);
          return path.map((coord) => Number(coord[2])).filter(Number.isFinite);
        };
    const getFilterValue = (datum: TripDatum, ctx?: AccessorContext<TripDatum>) => {
      const index = getIndex(datum, ctx);
      if (index < 0 || !timeFilterFlags[index]) {
        return -1;
      }
      const path = getPathAccessor(datum, ctx);
      const timestamps = getTimestamps(datum, getContext(datum, ctx));
      return path.length >= 2 && timestamps.length === path.length ? 1 : -1;
    };

    // Panel time filtering and joined-source lookups stay feature-oriented:
    // each trip row is selected once by the shared pipeline, while the per-vertex
    // timestamp array remains layer-local metadata that only drives trail animation.
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
        getPath: getPathAccessor as any,
        getTimestamps,
        getColor,
        getWidth: getWidth ?? 1,
        getFilterValue,
        filterRange: [1, 1],
        updateTriggers: {
          ...commonProps.updateTriggers,
          getTimestamps: updatesTimestamps,
          getColor: updatesColorValue,
          getWidth: updatesWidth,
          getFilterValue: [timeFilterFlags, options.timestamps.field],
        },
      } as any),
    ];
  },
};

export default tripsLayerDefinition;
