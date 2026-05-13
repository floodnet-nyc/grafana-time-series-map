import { ArcLayer } from '@deck.gl/layers';
import type { Feature } from 'geojson';
import type { ArcLayerConfig, ArcLayerSettings } from '../types';
import { buildColorAccessor } from '../../utils/deckgl/colorScales';
import { createBaseLayerConfig, section } from '../defaults';
import type { LayerDefinition, LayerRenderContext } from '../types';
import { createCommonLayerProps, createSourcePositionAccessor, createTargetPositionAccessor } from '../utils';

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
    const { config, features } = context;
    const options = config.settings;
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

export default arcLayerDefinition;
