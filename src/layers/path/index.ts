import { PathLayer } from '@deck.gl/layers';
import { DataFilterExtension } from '@deck.gl/extensions';
import type { Feature, LineString, MultiLineString } from 'geojson';
import { buildColorAccessor } from '../../utils/deckgl/colorScales';
import { registerLayer } from '../registry';
import type { LayerRenderContext, LayerRenderer, LayerOptionField } from '../types';

const schema: LayerOptionField[] = [
  { key: 'widthMinPixels', label: 'Min width (px)', type: 'number', defaultValue: 2 },
  { key: 'widthMaxPixels', label: 'Max width (px)', type: 'number', defaultValue: 10 },
  { key: 'widthField', label: 'Width field', type: 'fieldPicker', defaultValue: '' },
  { key: 'widthScale', label: 'Width scale', type: 'number', defaultValue: 1 },
  { key: 'capRounded', label: 'Rounded caps', type: 'boolean', defaultValue: true },
  { key: 'jointRounded', label: 'Rounded joints', type: 'boolean', defaultValue: true },
];

function getPath(f: Feature): number[][] | null {
  const g = f.geometry as LineString | MultiLineString;
  if (!g) return null;
  if (g.type === 'LineString') return g.coordinates as number[][];
  if (g.type === 'MultiLineString') return g.coordinates[0] as number[][];
  return null;
}

const renderer: LayerRenderer = {
  type: 'path',
  label: 'Path (line)',
  defaultOptions: {
    widthMinPixels: 2,
    widthMaxPixels: 10,
    widthField: '',
    widthScale: 1,
    capRounded: true,
    jointRounded: true,
  },
  optionsSchema: schema,

  renderLayers({ config, features, timeFilterFlags, onFeatureClick }: LayerRenderContext) {
    const opts = config.options as Record<string, any>;
    const getColor = buildColorAccessor(config.colorScale, [0, 155, 200, 200]);
    const lineFeatures = features.filter((f) => getPath(f) !== null);

    return [
      new PathLayer({
        id: config.id,
        data: lineFeatures,
        visible: config.visible,
        opacity: config.opacity,
        pickable: config.pickable ?? true,
        widthUnits: 'pixels' as const,
        widthMinPixels: opts.widthMinPixels ?? 2,
        widthMaxPixels: opts.widthMaxPixels ?? 10,
        capRounded: opts.capRounded ?? true,
        jointRounded: opts.jointRounded ?? true,
        getPath: (f: Feature) => getPath(f)! as any,
        getColor: getColor as any,
        getWidth: opts.widthField
          ? (f: Feature) => Number(f.properties?.[opts.widthField] ?? 1) * (opts.widthScale ?? 1)
          : 1,
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
