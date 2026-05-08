import { ArcLayer } from '@deck.gl/layers';
import { DataFilterExtension } from '@deck.gl/extensions';
import type { Feature } from 'geojson';
import { buildColorAccessor } from '../../utils/deckgl/colorScales';
import { registerLayer } from '../registry';
import type { LayerRenderContext, LayerRenderer, LayerOptionField } from '../types';

const schema: LayerOptionField[] = [
  { key: 'widthMinPixels', label: 'Min width (px)', type: 'number', defaultValue: 2 },
  { key: 'greatCircle', label: 'Great circle', type: 'boolean', defaultValue: false },
  { key: 'srcLngField', label: 'Source longitude field', type: 'fieldPicker', defaultValue: '' },
  { key: 'srcLatField', label: 'Source latitude field', type: 'fieldPicker', defaultValue: '' },
  { key: 'tgtLngField', label: 'Target longitude field', type: 'fieldPicker', defaultValue: '' },
  { key: 'tgtLatField', label: 'Target latitude field', type: 'fieldPicker', defaultValue: '' },
];

const renderer: LayerRenderer = {
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

  renderLayers({ config, features, timeFilterFlags, onFeatureClick }: LayerRenderContext) {
    const opts = config.options as Record<string, any>;
    const getColor = buildColorAccessor(config.colorScale, [0, 155, 200, 200]);

    return [
      new ArcLayer({
        id: `arc/${config.id}`,
        data: features,
        visible: config.visible,
        opacity: config.opacity,
        pickable: config.pickable ?? true,
        greatCircle: opts.greatCircle ?? false,
        widthMinPixels: opts.widthMinPixels ?? 2,
        getSourcePosition: (f: Feature) => {
          if (opts.srcLngField && opts.srcLatField) {
            return [
              Number(f.properties?.[opts.srcLngField] ?? 0),
              Number(f.properties?.[opts.srcLatField] ?? 0),
            ] as [number, number];
          }
          const coords = (f.geometry as any)?.coordinates;
          return coords ? [coords[0], coords[1]] : [0, 0];
        },
        getTargetPosition: (f: Feature) => {
          if (opts.tgtLngField && opts.tgtLatField) {
            return [
              Number(f.properties?.[opts.tgtLngField] ?? 0),
              Number(f.properties?.[opts.tgtLatField] ?? 0),
            ] as [number, number];
          }
          return [0, 0];
        },
        getSourceColor: getColor as any,
        getTargetColor: getColor as any,
        minZoom: config.minZoom,
        maxZoom: config.maxZoom,
        onClick: onFeatureClick
          ? (info: any) => info.object && onFeatureClick(info.object, info)
          : undefined,
        getFilterValue: (f: any) => (timeFilterFlags[f.__idx] ? 1 : -1),
        filterRange: [1, 1] as [number, number],
        extensions: [new DataFilterExtension({ filterSize: 1 })],
        updateTriggers: { getFilterValue: [timeFilterFlags] },
      }),
    ];
  },
};

registerLayer(renderer);
export default renderer;
