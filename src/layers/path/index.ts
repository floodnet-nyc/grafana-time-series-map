import { PathLayer } from '@deck.gl/layers';
import type { Feature, LineString, MultiLineString } from 'geojson';
import type { BaseLayerConfig, LayerDefinition, LayerRenderContext } from '../types';
import { buildColorAccessor } from '../../utils/deckgl/colorScales';
import { createBaseLayerConfig, section } from '../defaults';
import { createCommonLayerProps } from '../utils';

export interface PathLayerSettings {
  widthMinPixels: number;
  widthMaxPixels: number;
  widthField: string;
  widthScale: number;
  capRounded: boolean;
  jointRounded: boolean;
}

export type PathLayerConfig = BaseLayerConfig<'path', PathLayerSettings>;


function getPath(f: Feature): number[][] | null {
  const g = f.geometry as LineString | MultiLineString;
  if (!g) {
    return null;
  }
  if (g.type === 'LineString') {
    return g.coordinates as number[][];
  }
  if (g.type === 'MultiLineString') {
    return g.coordinates[0] as number[][];
  }
  return null;
}

const defaultSettings: PathLayerSettings = {
  widthMinPixels: 2,
  widthMaxPixels: 10,
  widthField: '',
  widthScale: 1,
  capRounded: true,
  jointRounded: true,
};

export const pathLayerDefinition: LayerDefinition<PathLayerConfig> = {
  type: 'path',
  label: 'Path (line)',
  createDefaultConfig(index) {
    return createBaseLayerConfig('path', 'Path', index, defaultSettings);
  },
  editorSections: [
    section('Path', [
      { key: 'widthMinPixels', label: 'Min width (px)', type: 'number', defaultValue: 2 },
      { key: 'widthMaxPixels', label: 'Max width (px)', type: 'number', defaultValue: 10 },
      { key: 'widthField', label: 'Width field', type: 'fieldPicker', defaultValue: '' },
      { key: 'widthScale', label: 'Width scale', type: 'number', defaultValue: 1 },
      { key: 'capRounded', label: 'Rounded caps', type: 'boolean', defaultValue: true },
      { key: 'jointRounded', label: 'Rounded joints', type: 'boolean', defaultValue: true },
    ]),
  ],
  renderLayers(context: LayerRenderContext<PathLayerConfig>) {
    const { config, getNumericAccessor } = context;
    const options = config.settings;

    const commonProps = createCommonLayerProps(context);
    const getColor = buildColorAccessor(config.colorScale, [0, 155, 200, 200]);
    const getWidth = getNumericAccessor(options.widthField, options.widthScale);
    
    return [
      new PathLayer({
        ...commonProps,
        widthUnits: 'pixels' as const,
        widthMinPixels: options.widthMinPixels,
        widthMaxPixels: options.widthMaxPixels,
        capRounded: options.capRounded,
        jointRounded: options.jointRounded,
        getPath: (f: Feature) => getPath(f)! as any,
        getColor,
        getWidth,
      }),
    ];
  },
};

export default pathLayerDefinition;
