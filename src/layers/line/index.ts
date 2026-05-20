import { LineLayer } from '@deck.gl/layers';
import type { Feature } from 'geojson';
import type { SourceRef } from '../../types';
import type { BaseLayerConfig, LayerDefinition, LayerRenderContext } from '../types';
import { buildColorAccessor } from '../../utils/deckgl/colorScales';
import { createBaseLayerConfig, createSourceRef, section } from '../defaults';
import { createCommonLayerProps } from '../utils';

export interface LineLayerSettings {
  srcLng: SourceRef;
  srcLat: SourceRef;
  tgtLng: SourceRef;
  tgtLat: SourceRef;
  widthMinPixels: number;
  widthMaxPixels: number;
  width: SourceRef;
  widthScale: number;
}

export type LineLayerConfig = BaseLayerConfig<'line', LineLayerSettings>;

const defaultSettings: LineLayerSettings = {
  srcLng: createSourceRef(),
  srcLat: createSourceRef(),
  tgtLng: createSourceRef(),
  tgtLat: createSourceRef(),
  widthMinPixels: 1,
  widthMaxPixels: 20,
  width: createSourceRef(),
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
      { key: 'srcLng', label: 'Source longitude field', type: 'fieldPicker', defaultValue: createSourceRef() },
      { key: 'srcLat', label: 'Source latitude field', type: 'fieldPicker', defaultValue: createSourceRef() },
    ]),
    section('Target', [
      { key: 'tgtLng', label: 'Target longitude field', type: 'fieldPicker', defaultValue: createSourceRef() },
      { key: 'tgtLat', label: 'Target latitude field', type: 'fieldPicker', defaultValue: createSourceRef() },
    ]),
    section('Style', [
      { key: 'widthMinPixels', label: 'Min width (px)', type: 'number', defaultValue: 1 },
      { key: 'widthMaxPixels', label: 'Max width (px)', type: 'number', defaultValue: 20 },
      { key: 'width', label: 'Width field', type: 'fieldPicker', defaultValue: createSourceRef() },
      { key: 'widthScale', label: 'Width scale', type: 'number', defaultValue: 1 },
    ]),
  ],
  renderLayers(context: LayerRenderContext<LineLayerConfig>) {
    const { config, features, getAccessors } = context;
    const options = config.settings;
    const [getColorValue] = config.colorScale?.field ? getAccessors.number(config.colorScale.field) : [undefined, []];
    const getColor = buildColorAccessor(config.colorScale, [0, 155, 200, 200], getColorValue);

    const commonProps = createCommonLayerProps(context);
    const [srcLngAccessor, updatesSrcLng] = getAccessors.number(options.srcLng);
    const [srcLatAccessor, updatesSrcLat] = getAccessors.number(options.srcLat);
    const [tgtLngAccessor, updatesTgtLng] = getAccessors.number(options.tgtLng);
    const [tgtLatAccessor, updatesTgtLat] = getAccessors.number(options.tgtLat);
    const [getWidth, updatesWidth] = getAccessors.number(options.width, options.widthScale);

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
          getWidth: updatesWidth,
          getSourcePosition: [...updatesSrcLat, ...updatesSrcLng],
          getTargetPosition: [...updatesTgtLat, ...updatesTgtLng],
        },
      }),
    ];
  },
};

export default lineLayerDefinition;
