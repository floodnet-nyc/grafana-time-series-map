import type { ColorScaleConfig, SourceRef } from '../../types';
import type { BaseLayerConfig, LayerDefinition, LayerRenderContext } from '../types';
import { createBaseLayerConfig, createSourceRef, section } from '../defaults';
import { renderCogLayers } from './runtime';

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
  renderLayers(context: LayerRenderContext<CogLayerConfig>) {
    return renderCogLayers(context);
  },
};

export default cogLayerDefinition;
