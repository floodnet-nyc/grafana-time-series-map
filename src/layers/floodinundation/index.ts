import { SolidPolygonLayer } from '@deck.gl/layers';
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
float depthDiff = vInstanceCurrentDepth - vInstanceContourDepth;
float alpha = smoothstep(0.0, 3.0, depthDiff);
if (alpha < 0.005) discard;
color = vec4(depthToColorSmooth(depthDiff) / 255.0, alpha * vInstanceFillOpacity);
`.trim();

const schema: LayerOptionField[] = [
  { key: 'contourDepthField', label: 'Contour depth field (inches)', type: 'fieldPicker', defaultValue: '' },
  { key: 'sensorKeyField', label: 'Sensor key field', type: 'fieldPicker', defaultValue: '' },
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
    contourDepthField: '',
    sensorKeyField: '',
    fillOpacity: 0.5,
  },
  optionsSchema: schema,

  renderLayers({ config, features, lookupValues, onFeatureClick }: LayerRenderContext) {
    const opts = config.options as Record<string, any>;
    const contourDepthField: string = opts.contourDepthField ?? '';
    const sensorKeyField: string = opts.sensorKeyField ?? '';
    const fillOpacity: number = opts.fillOpacity ?? 0.5;

    return [
      new SolidPolygonLayer({
        id: config.id,
        // Pass features directly (stable reference from usePanelLayers memo) so deck.gl
        // doesn't re-tessellate polygons on every cursor tick. getPolygon handles null geometry.
        data: features,
        visible: config.visible,
        pickable: false,
        filled: true,
        stroked: false,
        getPolygon: (f: Feature) => (getPolygonCoords(f)?.[0] ?? []) as any,
        getFillColor: [0, 0, 0, 255],
        minZoom: config.minZoom,
        maxZoom: config.maxZoom,
        onClick: onFeatureClick
          ? (info: any) => info.object && onFeatureClick(info.object, info)
          : undefined,
        getContourDepth: (f: Feature) => Number(f.properties?.[contourDepthField] ?? 0),
        getCurrentDepth: (f: Feature) =>
          lookupValues?.get(String(f.properties?.[sensorKeyField] ?? ''))?.depth ?? 0,
        getFillOpacity: (_f: Feature) => fillOpacity,
        extensions: [
          new MathExtension({
            name: `floodinundation_${config.id}`,
            attrs: {
              contourDepth: { type: 'float' },
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
          getContourDepth: [],
          getCurrentDepth: [lookupValues],
        },
        parameters: { depthTest: false },
      }),
    ];
  },
};

registerLayer(renderer);
export default renderer;
