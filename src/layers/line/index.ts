import { LineLayer } from '@deck.gl/layers';
import type { Feature } from 'geojson';
import type { BaseLayerConfig, LayerDefinition, LayerRenderContext } from '../types';

export interface LineLayerSettings {
  srcLngField: string;
  srcLatField: string;
  tgtLngField: string;
  tgtLatField: string;
  widthMinPixels: number;
  widthMaxPixels: number;
  widthField: string;
  widthScale: number;
}

export type LineLayerConfig = BaseLayerConfig<'line', LineLayerSettings>;
import { buildColorAccessor } from '../../utils/deckgl/colorScales';
import { createBaseLayerConfig, section } from '../defaults';
import { createCommonLayerProps } from '../utils';

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
    const { config, features, getNumericAccessor } = context;
    const options = config.settings;

    const getColor = buildColorAccessor(config.colorScale, [0, 155, 200, 200]);

    const commonProps = createCommonLayerProps(context);
    const srcLngAccessor = getNumericAccessor(options.srcLngField);
    const srcLatAccessor = getNumericAccessor(options.srcLatField);
    const tgtLngAccessor = getNumericAccessor(options.tgtLngField);
    const tgtLatAccessor = getNumericAccessor(options.tgtLatField);
    const getWidth = getNumericAccessor(options.widthField, options.widthScale);

    return [
      new LineLayer({
        ...commonProps,
        id: `line/${config.id}`,
        data: features,
        widthUnits: 'pixels' as const,
        widthMinPixels: options.widthMinPixels,
        widthMaxPixels: options.widthMaxPixels,
        getSourcePosition: srcLatAccessor && srcLngAccessor ? (f: Feature, ctx) => [
          srcLngAccessor(f, ctx),
          srcLatAccessor(f, ctx),
        ] : undefined,
        getTargetPosition: tgtLatAccessor && tgtLngAccessor ? (f: Feature, ctx) => [
          tgtLngAccessor(f, ctx),
          tgtLatAccessor(f, ctx),
        ] : undefined,
        getColor: getColor as any,
        getWidth: getWidth ?? 0,
        updateTriggers: {
          ...commonProps.updateTriggers,
          getWidth: [options.widthField, options.widthScale],
        },
      }),
    ];
  },
};

export default lineLayerDefinition;
