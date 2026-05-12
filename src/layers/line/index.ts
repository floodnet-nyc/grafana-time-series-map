import { LineLayer } from '@deck.gl/layers';
import type { Feature } from 'geojson';
import { buildColorAccessor } from '../../utils/deckgl/colorScales';
import { registerLayer } from '../registry';
import type { LayerRenderContext, LayerRenderer, LayerOptionField } from '../types';
import { createCommonLayerProps, createSourcePositionAccessor, createTargetPositionAccessor } from '../utils';

interface LineLayerOptions {
  srcLngField: string;
  srcLatField: string;
  tgtLngField: string;
  tgtLatField: string;
  widthMinPixels: number;
  widthMaxPixels: number;
  widthField: string;
  widthScale: number;
}

const schema: LayerOptionField[] = [
  { key: 'srcLngField', label: 'Source longitude field', type: 'fieldPicker', defaultValue: '', section: 'Source' },
  { key: 'srcLatField', label: 'Source latitude field', type: 'fieldPicker', defaultValue: '', section: 'Source' },
  { key: 'tgtLngField', label: 'Target longitude field', type: 'fieldPicker', defaultValue: '', section: 'Target' },
  { key: 'tgtLatField', label: 'Target latitude field', type: 'fieldPicker', defaultValue: '', section: 'Target' },
  { key: 'widthMinPixels', label: 'Min width (px)', type: 'number', defaultValue: 1, section: 'Style' },
  { key: 'widthMaxPixels', label: 'Max width (px)', type: 'number', defaultValue: 20, section: 'Style' },
  { key: 'widthField', label: 'Width field', type: 'fieldPicker', defaultValue: '', section: 'Style' },
  { key: 'widthScale', label: 'Width scale', type: 'number', defaultValue: 1, section: 'Style' },
];

const renderer: LayerRenderer<LineLayerOptions> = {
  type: 'line',
  label: 'Line (origin→destination)',
  defaultOptions: {
    srcLngField: '',
    srcLatField: '',
    tgtLngField: '',
    tgtLatField: '',
    widthMinPixels: 1,
    widthMaxPixels: 20,
    widthField: '',
    widthScale: 1,
  },
  optionsSchema: schema,

  renderLayers(context: LayerRenderContext<LineLayerOptions>) {
    const { config, features, options } = context;
    const getColor = buildColorAccessor(config.colorScale, [0, 155, 200, 200]);
    const commonProps = createCommonLayerProps(context);
    const getSourcePosition = createSourcePositionAccessor(options);
    const getTargetPosition = createTargetPositionAccessor(options);

    return [
      new LineLayer({
        ...commonProps,
        id: `line/${config.id}`,
        data: features,
        widthUnits: 'pixels' as const,
        widthMinPixels: options.widthMinPixels,
        widthMaxPixels: options.widthMaxPixels,
        getSourcePosition: (f: Feature) => getSourcePosition(f),
        getTargetPosition: (f: Feature) => getTargetPosition(f),
        getColor: getColor as any,
        getWidth: options.widthField
          ? (f: Feature) => Number(f.properties?.[options.widthField] ?? 1) * options.widthScale
          : 1,
        updateTriggers: {
          ...commonProps.updateTriggers,
          getWidth: [options.widthField, options.widthScale],
        },
        parameters: { depthTest: false },
      }),
    ];
  },
};

registerLayer(renderer);
export default renderer;
