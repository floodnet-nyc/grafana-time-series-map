import { LineLayer } from '@deck.gl/layers';
import { DataFilterExtension } from '@deck.gl/extensions';
import type { Feature } from 'geojson';
import { buildColorAccessor } from '../../utils/deckgl/colorScales';
import { registerLayer } from '../registry';
import type { LayerRenderContext, LayerRenderer, LayerOptionField } from '../types';

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
  label: 'Line (straight)',
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

  renderLayers({ config, features, timeFilterFlags, onFeatureClick }: LayerRenderContext) {
    const opts = config.options as Record<string, any>;
    const getColor = buildColorAccessor(config.colorScale, [0, 155, 200, 200]);

    return [
      new LineLayer({
        id: config.id,
        data: features,
        visible: config.visible,
        opacity: config.opacity,
        pickable: config.pickable ?? true,
        widthUnits: 'pixels' as const,
        widthMinPixels: opts.widthMinPixels ?? 1,
        widthMaxPixels: opts.widthMaxPixels ?? 20,
        minZoom: config.minZoom,
        maxZoom: config.maxZoom,
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
        getColor: getColor as any,
        getWidth: opts.widthField
          ? (f: Feature) => Number(f.properties?.[opts.widthField] ?? 1) * (opts.widthScale ?? 1)
          : 1,
        onClick: onFeatureClick
          ? (info: any) => info.object && onFeatureClick(info.object, info)
          : undefined,
        getFilterValue: (f: any) => (timeFilterFlags[f.__idx] ? 1 : -1),
        filterRange: [1, 1] as [number, number],
        extensions: [new DataFilterExtension({ filterSize: 1 })],
        updateTriggers: {
          getFilterValue: [timeFilterFlags],
          getWidth: [opts.widthField, opts.widthScale],
        },
        parameters: { depthTest: false },
      }),
    ];
  },
};

registerLayer(renderer);
export default renderer;
