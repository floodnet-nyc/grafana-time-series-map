import { ArcLayer } from '@deck.gl/layers';
import type { Feature } from 'geojson';
import type { BaseLayerConfig, LayerDefinition, LayerRenderContext } from '../types';
import type { SourceRef } from '../../types';
import { buildColorAccessor } from '../../utils/deckgl/colorScales';
import { createBaseLayerConfig, createSourceRef, section } from '../defaults';
import { createCommonLayerProps } from '../utils';

export interface ArcLayerSettings {
  widthMinPixels: number;
  greatCircle: boolean;
  srcLng: SourceRef;
  srcLat: SourceRef;
  tgtLng: SourceRef;
  tgtLat: SourceRef;
}

export type ArcLayerConfig = BaseLayerConfig<'arc', ArcLayerSettings>;

const defaultSettings: ArcLayerSettings = {
  widthMinPixels: 2,
  greatCircle: false,
  srcLng: createSourceRef(),
  srcLat: createSourceRef(),
  tgtLng: createSourceRef(),
  tgtLat: createSourceRef(),
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
      { key: 'srcLng', label: 'Source longitude field', type: 'fieldPicker', defaultValue: createSourceRef() },
      { key: 'srcLat', label: 'Source latitude field', type: 'fieldPicker', defaultValue: createSourceRef() },
      { key: 'tgtLng', label: 'Target longitude field', type: 'fieldPicker', defaultValue: createSourceRef() },
      { key: 'tgtLat', label: 'Target latitude field', type: 'fieldPicker', defaultValue: createSourceRef() },
    ]),
  ],
  renderLayers(context: LayerRenderContext<ArcLayerConfig>) {
    const { config, features, getNumericAccessor } = context;
    const options = config.settings;
    const commonProps = createCommonLayerProps(context);
    const [getColorValue] = config.colorScale?.field ? getNumericAccessor(config.colorScale.field) : [undefined, []];
    const getColor = buildColorAccessor(config.colorScale, [0, 155, 200, 200], getColorValue);
    const [srcLngAccessor, updatesSrcLng] = getNumericAccessor(options.srcLng);
    const [srcLatAccessor, updatesSrcLat] = getNumericAccessor(options.srcLat);
    const [tgtLngAccessor, updatesTgtLng] = getNumericAccessor(options.tgtLng);
    const [tgtLatAccessor, updatesTgtLat] = getNumericAccessor(options.tgtLat);

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
