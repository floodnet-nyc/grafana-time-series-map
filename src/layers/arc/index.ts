import { ArcLayer } from '@deck.gl/layers';
import type { Feature } from 'geojson';
import type { BaseLayerConfig, LayerDefinition, LayerRenderContext } from '../types';
import { buildColorAccessor } from '../../utils/deckgl/colorScales';
import { createBaseLayerConfig, section } from '../defaults';
import { createCommonLayerProps } from '../utils';

export interface ArcLayerSettings {
  widthMinPixels: number;
  greatCircle: boolean;
  srcLngField: string;
  srcLatField: string;
  tgtLngField: string;
  tgtLatField: string;
}

export type ArcLayerConfig = BaseLayerConfig<'arc', ArcLayerSettings>;

const defaultSettings: ArcLayerSettings = {
  widthMinPixels: 2,
  greatCircle: false,
  srcLngField: '',
  srcLatField: '',
  tgtLngField: '',
  tgtLatField: '',
};

export const arcLayerDefinition: LayerDefinition<ArcLayerConfig> = {
  type: 'arc',
  label: 'Arc (origin→destination)',
  createDefaultConfig(index) {
    return createBaseLayerConfig('arc', 'Arc', index, defaultSettings);
  },
  editorSections: [
    section('Arc', [
      { key: 'widthMinPixels', label: 'Min width (px)', type: 'number', defaultValue: 2 },
      { key: 'greatCircle', label: 'Great circle', type: 'boolean', defaultValue: false },
      { key: 'srcLngField', label: 'Source longitude field', type: 'fieldPicker', defaultValue: '' },
      { key: 'srcLatField', label: 'Source latitude field', type: 'fieldPicker', defaultValue: '' },
      { key: 'tgtLngField', label: 'Target longitude field', type: 'fieldPicker', defaultValue: '' },
      { key: 'tgtLatField', label: 'Target latitude field', type: 'fieldPicker', defaultValue: '' },
    ]),
  ],
  renderLayers(context: LayerRenderContext<ArcLayerConfig>) {
    const { config, features, getNumericAccessor } = context;
    const options = config.settings;
    const commonProps = createCommonLayerProps(context);
    const getColor = buildColorAccessor(config.colorScale, [0, 155, 200, 200]);
    const [srcLngAccessor, updatesSrcLng] = getNumericAccessor(options.srcLngField);
    const [srcLatAccessor, updatesSrcLat] = getNumericAccessor(options.srcLatField);
    const [tgtLngAccessor, updatesTgtLng] = getNumericAccessor(options.tgtLngField);
    const [tgtLatAccessor, updatesTgtLat] = getNumericAccessor(options.tgtLatField);

    return [
      new ArcLayer({
        ...commonProps,
        id: `arc/${config.id}`,
        data: features,
        greatCircle: options.greatCircle,
        widthMinPixels: options.widthMinPixels,
        getSourcePosition: srcLatAccessor && srcLngAccessor ? (f: Feature, ctx) => [
          srcLngAccessor(f, ctx),
          srcLatAccessor(f, ctx),
        ] : undefined,
        getTargetPosition: tgtLatAccessor && tgtLngAccessor ? (f: Feature, ctx) => [
          tgtLngAccessor(f, ctx),
          tgtLatAccessor(f, ctx),
        ] : undefined,
        getSourceColor: getColor as any,
        getTargetColor: getColor as any,
        updateTriggers: {
          getSourcePosition: [...updatesSrcLng, ...updatesSrcLat],
          getTargetPosition: [...updatesTgtLng, ...updatesTgtLat],
        },
      }),
    ];
  },
};

export default arcLayerDefinition;
