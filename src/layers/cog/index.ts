import type { ColorScaleConfig, SourceRef } from '../../types';
import type { BaseLayerConfig, LayerDefinition } from '../types';
import { createBaseLayerConfig, createSourceRef, section } from '../defaults';

export interface CogLayerSettings {
  url: SourceRef;
  timestamp: SourceRef;
  colorMaxValue: number;
  maxRequests: number;
  maxFrameRate: number;
}

export type CogLayerConfig = BaseLayerConfig<'cog', CogLayerSettings>;

export const DEFAULT_COG_COLOR_SCALE: ColorScaleConfig = {
  type: 'gradient',
  schemeName: 'MrmsPrecip',
  scaleMin: 0,
  scaleMax: 1,
};

export const defaultCogSettings: CogLayerSettings = {
  url: createSourceRef('url'),
  timestamp: createSourceRef('time'),
  colorMaxValue: 200,
  maxRequests: 4,
  maxFrameRate: 0,
};

export const cogLayerDefinition: LayerDefinition<CogLayerConfig> = {
  type: 'cog',
  label: 'COG Raster',
  createDefaultConfig(index) {
    return createBaseLayerConfig('cog', 'COG Raster', index, defaultCogSettings, { type: 'none' });
  },
  editorSections: [
    section('COG Raster', [
      { key: 'url', label: 'URL field', type: 'fieldPicker', defaultValue: createSourceRef('url') },
      { key: 'timestamp', label: 'Timestamp field', type: 'fieldPicker', defaultValue: createSourceRef('time') },
      { key: 'maxRequests', label: 'Max concurrent tile requests', type: 'number', defaultValue: 4 },
      { key: 'maxFrameRate', label: 'Max frame rate (fps)', type: 'number', defaultValue: 0 },
    ]),
  ],
  renderLayers() {
    return [];
  },
};

const pad2 = (value: number) => String(value).padStart(2, '0');
const formatUtcTimestamp = (timeMs: number) => {
  const time = new Date(timeMs);
  return [
    time.getUTCFullYear(),
    pad2(time.getUTCMonth() + 1),
    pad2(time.getUTCDate()),
    'T',
    pad2(time.getUTCHours()),
    pad2(time.getUTCMinutes()),
    pad2(time.getUTCSeconds()),
    'Z',
  ].join('');
};

export const buildPrecipCogUrl = (timeMs: number) =>
  `http://localhost:3000/sample-data/cogs/${formatUtcTimestamp(timeMs)}.tif`;

export default cogLayerDefinition;
