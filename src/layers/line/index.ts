import { LineLayer } from '@deck.gl/layers';
import type { Feature } from 'geojson';
import { buildColorAccessor } from '../../utils/deckgl/colorScales';
import { registerLayer } from '../registry';
import type { LayerRenderContext, LayerRenderer, LayerOptionField } from '../types';
import { createCommonLayerProps, createSourcePositionAccessor, createTargetPositionAccessor } from '../utils';

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

const renderer: LayerRenderer = {
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

  renderLayers(context: LayerRenderContext) {
    const { config, features } = context;
    const opts = config.options as Record<string, any>;
    const getColor = buildColorAccessor(config.colorScale, [0, 155, 200, 200]);
    const commonProps = createCommonLayerProps(context);
    const getSourcePosition = createSourcePositionAccessor(opts);
    const getTargetPosition = createTargetPositionAccessor(opts);

    return [
      new LineLayer({
        ...commonProps,
        id: `line/${config.id}`,
        data: features,
        widthUnits: 'pixels' as const,
        widthMinPixels: opts.widthMinPixels ?? 1,
        widthMaxPixels: opts.widthMaxPixels ?? 20,
        getSourcePosition: (f: Feature) => getSourcePosition(f),
        getTargetPosition: (f: Feature) => getTargetPosition(f),
        getColor: getColor as any,
        getWidth: opts.widthField
          ? (f: Feature) => Number(f.properties?.[opts.widthField] ?? 1) * (opts.widthScale ?? 1)
          : 1,
        updateTriggers: {
          ...commonProps.updateTriggers,
          getWidth: [opts.widthField, opts.widthScale],
        },
        parameters: { depthTest: false },
      }),
    ];
  },
};

registerLayer(renderer);
export default renderer;
