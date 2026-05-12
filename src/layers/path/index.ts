import { PathLayer } from '@deck.gl/layers';
import type { Feature, LineString, MultiLineString } from 'geojson';
import { buildColorAccessor } from '../../utils/deckgl/colorScales';
import { registerLayer } from '../registry';
import type { LayerRenderContext, LayerRenderer, LayerOptionField } from '../types';
import { createCommonLayerProps, getNumericProperty } from '../utils';

interface PathLayerOptions {
  widthMinPixels: number;
  widthMaxPixels: number;
  widthField: string;
  widthScale: number;
  capRounded: boolean;
  jointRounded: boolean;
}

const schema: LayerOptionField[] = [
  { key: 'widthMinPixels', label: 'Min width (px)', type: 'number', defaultValue: 2 },
  { key: 'widthMaxPixels', label: 'Max width (px)', type: 'number', defaultValue: 10 },
  { key: 'widthField', label: 'Width field', type: 'fieldPicker', defaultValue: '' },
  { key: 'widthScale', label: 'Width scale', type: 'number', defaultValue: 1 },
  { key: 'capRounded', label: 'Rounded caps', type: 'boolean', defaultValue: true },
  { key: 'jointRounded', label: 'Rounded joints', type: 'boolean', defaultValue: true },
];

function getPath(f: Feature): number[][] | null {
  const g = f.geometry as LineString | MultiLineString;
  if (!g) {return null;}
  if (g.type === 'LineString') {return g.coordinates as number[][];}
  if (g.type === 'MultiLineString') {return g.coordinates[0] as number[][];}
  return null;
}

const renderer: LayerRenderer<PathLayerOptions> = {
  type: 'path',
  label: 'Path (line)',
  defaultOptions: {
    widthMinPixels: 2,
    widthMaxPixels: 10,
    widthField: '',
    widthScale: 1,
    capRounded: true,
    jointRounded: true,
  },
  optionsSchema: schema,

  renderLayers(context: LayerRenderContext<PathLayerOptions>) {
    const { config, options } = context;
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

registerLayer(renderer);
export default renderer;
