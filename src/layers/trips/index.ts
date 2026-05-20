import { TripsLayer } from '@deck.gl/geo-layers';
import { DataFilterExtension } from '@deck.gl/extensions';
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

function getValidTripPath(feature: Feature) {
  const path = getPath(feature);
  return path && path.length >= 2 ? path : [];
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
      // {
      //   key: 'timestampUnit',
      //   label: 'Timestamp unit',
      //   type: 'select',
      //   defaultValue: 'ms',
      //   selectOptions: [
      //     { label: 'Milliseconds', value: 'ms' },
      //     { label: 'Seconds', value: 's' },
      //   ],
      // },
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
    const { config, features, cursorTimeMs, getAccessors } = context;
    const options = config.settings;
    const commonProps = createCommonLayerProps(context);
    const [getColorValue, updatesColorValue] = config.colorScale?.field ? getAccessors.number(config.colorScale.field) : [undefined, []];
    const getColor = buildColorAccessor(config.colorScale, [0, 200, 180, 220], getColorValue);
    const [getWidth, updatesWidth] = getAccessors.number(options.width, 1);
    const [getTimestamps, updatesTimestamps] = getAccessors.numericArray(options.timestamps);

    // Panel time filtering and joined-source lookups stay feature-oriented:
    // each trip row is selected once by the shared pipeline, while the per-vertex
    // timestamp array remains layer-local metadata that only drives trail animation.
    return [
      new TripsLayer<Feature>({
        ...commonProps,
        data: features,
        currentTime: cursorTimeMs,
        trailLength: options.trailLengthMs,
        fadeTrail: options.fadeTrail,
        widthUnits: 'pixels',
        widthMinPixels: options.widthMinPixels,
        widthMaxPixels: options.widthMaxPixels,
        capRounded: options.capRounded,
        jointRounded: options.jointRounded,
        getPath: getValidTripPath,
        getTimestamps,
        getColor,
        getWidth: getWidth ?? 1,
        updateTriggers: {
          ...commonProps.updateTriggers,
          getTimestamps: updatesTimestamps,
          getColor: updatesColorValue,
          getWidth: updatesWidth,
        },
      } as any),
    ];
  },
};

export default tripsLayerDefinition;
