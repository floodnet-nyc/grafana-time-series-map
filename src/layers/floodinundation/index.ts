import { SolidPolygonLayer } from '@deck.gl/layers';
import { DataFilterExtension } from '@deck.gl/extensions';
import type { Feature, Polygon, MultiPolygon } from 'geojson';
import { MathExtension } from '../../utils/deckgl/MathExtension';
import { registerLayer } from '../registry';
import type { LayerRenderContext, LayerRenderer, LayerOptionField } from '../types';

const DEPTH_COLOR_GLSL = `
vec3 depthToColorSmooth(float d) {
  vec3 c0 = vec3(0.0, 155.0, 104.0);
  vec3 c1 = vec3(0.0, 204.0, 255.0);
  vec3 c2 = vec3(255.0, 162.0, 68.0);
  vec3 c3 = vec3(254.0, 77.0, 76.0);
  vec3 c4 = vec3(215.0, 77.0, 254.0);
  if (d < 4.0)  return mix(c0, c1, smoothstep(0.0, 4.0, d));
  if (d < 12.0) return mix(c1, c2, smoothstep(4.0, 12.0, d));
  if (d < 24.0) return mix(c2, c3, smoothstep(12.0, 24.0, d));
  return mix(c3, c4, smoothstep(24.0, 40.0, d));
}
`.trim();

const FILTER_COLOR_GLSL = `
float depthDiff = vInstanceCurrentDepth - vInstanceRelativeElevation;
float alpha = smoothstep(0.0, 3.0, depthDiff);
if (alpha < 0.005) discard;
color = vec4(depthToColorSmooth(depthDiff) / 255.0, alpha * vInstanceFillOpacity);
`.trim();

const schema: LayerOptionField[] = [
  { key: 'relativeElevationField', label: 'Relative elevation field (inches)', type: 'fieldPicker', defaultValue: '' },
  { key: 'currentDepthField', label: 'Current depth field (inches)', type: 'fieldPicker', defaultValue: '' },
  { key: 'fillOpacity', label: 'Fill opacity (0–1)', type: 'number', defaultValue: 0.5 },
];

function getPolygonCoords(f: Feature): number[][][] | null {
  const g = f.geometry as Polygon | MultiPolygon;
  if (!g) return null;
  if (g.type === 'Polygon') return g.coordinates as number[][][];
  if (g.type === 'MultiPolygon') return g.coordinates[0] as number[][][];
  return null;
}

const renderer: LayerRenderer = {
  type: 'flood-inundation',
  label: 'Flood Inundation',
  defaultOptions: {
    relativeElevationField: '',
    currentDepthField: '',
    fillOpacity: 0.5,
  },
  optionsSchema: schema,

  renderLayers({ config, features, timeFilterFlags, onFeatureClick }: LayerRenderContext) {
    const opts = config.options as Record<string, any>;
    const relativeElevationField: string = opts.relativeElevationField ?? '';
    const currentDepthField: string = opts.currentDepthField ?? '';
    const fillOpacity: number = opts.fillOpacity ?? 0.5;

    const polygonFeatures = features.filter((f) => getPolygonCoords(f) !== null);

    return [
      new SolidPolygonLayer({
        id: config.id,
        data: polygonFeatures,
        visible: config.visible,
        pickable: config.pickable ?? false,
        filled: true,
        stroked: false,
        getPolygon: (f: Feature) => getPolygonCoords(f)![0] as any,
        getFillColor: [0, 0, 0, 255],
        minZoom: config.minZoom,
        maxZoom: config.maxZoom,
        onClick: onFeatureClick
          ? (info: any) => info.object && onFeatureClick(info.object, info)
          : undefined,
        getFilterValue: (f: any) => (timeFilterFlags[f.__idx] ? 1 : -1),
        filterRange: [1, 1] as [number, number],
        getRelativeElevation: (f: Feature) => Number(f.properties?.[relativeElevationField] ?? 0),
        getCurrentDepth: (f: Feature) => Number(f.properties?.[currentDepthField] ?? 0),
        getFillOpacity: (_f: Feature) => fillOpacity,
        extensions: [
          new DataFilterExtension({ filterSize: 1 }),
          new MathExtension({
            name: `floodinundation_${config.id}`,
            attrs: {
              relativeElevation: { type: 'float' },
              currentDepth: { type: 'float' },
              fillOpacity: { type: 'float' },
            },
            uniforms: {},
            inject: {
              'fs:#decl': DEPTH_COLOR_GLSL,
              'fs:DECKGL_FILTER_COLOR': FILTER_COLOR_GLSL,
            },
          }),
        ],
        updateTriggers: {
          getFilterValue: [timeFilterFlags],
          getCurrentDepth: [timeFilterFlags],
        },
        parameters: { depthTest: false },
      }),
    ];
  },
};

registerLayer(renderer);
export default renderer;
