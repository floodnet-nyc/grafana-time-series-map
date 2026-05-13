import { LineLayer } from '@deck.gl/layers';
import type { Feature } from 'geojson';
import type { LineLayerConfig, LineLayerSettings } from '../types';
import { buildColorAccessor } from '../../utils/deckgl/colorScales';
import { createBaseLayerConfig, section } from '../defaults';
import type { LayerDefinition, LayerRenderContext } from '../types';
import { createCommonLayerProps, createSourcePositionAccessor, createTargetPositionAccessor } from '../utils';

const defaultSettings: LineLayerSettings = {
  srcLngField: '',
  srcLatField: '',
  tgtLngField: '',
  tgtLatField: '',
  widthMinPixels: 1,
  widthMaxPixels: 20,
  widthField: '',
  widthScale: 1,
};

export const lineLayerDefinition: LayerDefinition<LineLayerConfig> = {
  type: 'line',
  label: 'Line (origin→destination)',
  createDefaultConfig(index) {
    return createBaseLayerConfig('line', 'Line', index, defaultSettings);
  },
  editorSections: [
    section('Source', [
      { key: 'srcLngField', label: 'Source longitude field', type: 'fieldPicker', defaultValue: '' },
      { key: 'srcLatField', label: 'Source latitude field', type: 'fieldPicker', defaultValue: '' },
    ]),
    section('Target', [
      { key: 'tgtLngField', label: 'Target longitude field', type: 'fieldPicker', defaultValue: '' },
      { key: 'tgtLatField', label: 'Target latitude field', type: 'fieldPicker', defaultValue: '' },
    ]),
    section('Style', [
      { key: 'widthMinPixels', label: 'Min width (px)', type: 'number', defaultValue: 1 },
      { key: 'widthMaxPixels', label: 'Max width (px)', type: 'number', defaultValue: 20 },
      { key: 'widthField', label: 'Width field', type: 'fieldPicker', defaultValue: '' },
      { key: 'widthScale', label: 'Width scale', type: 'number', defaultValue: 1 },
    ]),
  ],
  renderLayers(context: LayerRenderContext<LineLayerConfig>) {
    const { config, features } = context;
    const options = config.settings;
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
        getWidth: options.widthField ? (f: Feature) => Number(f.properties?.[options.widthField] ?? 1) * options.widthScale : 1,
        updateTriggers: {
          ...commonProps.updateTriggers,
          getWidth: [options.widthField, options.widthScale],
        },
        parameters: { depthTest: false },
      }),
    ];
  },
};

export default lineLayerDefinition;
