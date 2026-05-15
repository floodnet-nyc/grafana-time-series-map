import { PathLayer } from '@deck.gl/layers';
import type { Feature, LineString, MultiLineString } from 'geojson';
import type { BaseLayerConfig, LayerDefinition, LayerRenderContext } from '../types';

export interface PathLayerSettings {
  widthMinPixels: number;
  widthMaxPixels: number;
  widthField: string;
  widthScale: number;
  capRounded: boolean;
  jointRounded: boolean;
}

export type PathLayerConfig = BaseLayerConfig<'path', PathLayerSettings>;
import { buildColorAccessor } from '../../utils/deckgl/colorScales';
import { createBaseLayerConfig, section } from '../defaults';
import { createCommonLayerProps, getNumericProperty } from '../utils';

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
    const { config } = context;
    const options = config.settings;
    const commonProps = createCommonLayerProps(context);
    return [
      new PathLayer({
        ...commonProps,
        widthUnits: 'pixels' as const,
        widthMinPixels: options.widthMinPixels,
        widthMaxPixels: options.widthMaxPixels,
        capRounded: options.capRounded,
        jointRounded: options.jointRounded,
        getPath: (f: Feature) => getPath(f)! as any,
        getColor: buildColorAccessor(config.colorScale, [0, 155, 200, 200]),
        getWidth: options.widthField
          ? (f: Feature) => getNumericProperty(f, options.widthField) * options.widthScale
          : 1,
      }),
    ];
  },
};

export default pathLayerDefinition;
