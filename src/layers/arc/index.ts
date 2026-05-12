import { ArcLayer } from '@deck.gl/layers';
import type { Feature } from 'geojson';
import { buildColorAccessor } from '../../utils/deckgl/colorScales';
import { registerLayer } from '../registry';
import type { LayerRenderContext, LayerRenderer, LayerOptionField } from '../types';
import { createCommonLayerProps, createSourcePositionAccessor, createTargetPositionAccessor } from '../utils';

interface ArcLayerOptions {
  widthMinPixels: number;
  greatCircle: boolean;
  srcLngField: string;
  srcLatField: string;
  tgtLngField: string;
  tgtLatField: string;
}

const schema: LayerOptionField[] = [
  { key: 'widthMinPixels', label: 'Min width (px)', type: 'number', defaultValue: 2 },
  { key: 'greatCircle', label: 'Great circle', type: 'boolean', defaultValue: false },
  { key: 'srcLngField', label: 'Source longitude field', type: 'fieldPicker', defaultValue: '' },
  { key: 'srcLatField', label: 'Source latitude field', type: 'fieldPicker', defaultValue: '' },
  { key: 'tgtLngField', label: 'Target longitude field', type: 'fieldPicker', defaultValue: '' },
  { key: 'tgtLatField', label: 'Target latitude field', type: 'fieldPicker', defaultValue: '' },
];

const renderer: LayerRenderer<ArcLayerOptions> = {
  type: 'arc',
  label: 'Arc (origin→destination)',
  defaultOptions: {
    widthMinPixels: 2,
    greatCircle: false,
    srcLngField: '',
    srcLatField: '',
    tgtLngField: '',
    tgtLatField: '',
  },
  optionsSchema: schema,

  renderLayers(context: LayerRenderContext<ArcLayerOptions>) {
    const { config, features, options } = context;
    const getColor = buildColorAccessor(config.colorScale, [0, 155, 200, 200]);
    const commonProps = createCommonLayerProps(context);
    const getSourcePosition = createSourcePositionAccessor(options);
    const getTargetPosition = createTargetPositionAccessor(options);

    return [
      new ArcLayer({
        ...commonProps,
        id: `arc/${config.id}`,
        data: features,
        greatCircle: options.greatCircle,
        widthMinPixels: options.widthMinPixels,
        getSourcePosition: (f: Feature) => getSourcePosition(f),
        getTargetPosition: (f: Feature) => getTargetPosition(f),
        getSourceColor: getColor as any,
        getTargetColor: getColor as any,
      }),
    ];
  },
};

registerLayer(renderer);
export default renderer;
