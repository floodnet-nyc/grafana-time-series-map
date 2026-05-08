import { SolidPolygonLayer } from '@deck.gl/layers';
import type { Feature, Polygon, MultiPolygon } from 'geojson';
import { CreateMathExtensionSubclass } from '../../utils/deckgl/MathExtension';
import { buildInterpolateColorGlsl } from '../../utils/deckgl/colorScales';
import { registerLayer } from '../registry';
import type { LayerRenderContext, LayerRenderer, LayerOptionField } from '../types';
import type { ColorScaleConfig } from '../../types';

// Calls interpolateColor() defined in fs:#decl via buildInterpolateColorGlsl.
const FS_FILTER_COLOR = `
float depthDiff = vInstanceCurrentDepth - vInstanceContourDepth;
float alpha = smoothstep(0.0, 3.0, depthDiff) * vInstanceFillOpacity;
if (alpha < 0.005) discard;
vec4 c = interpolateColor(depthDiff);
color = vec4(c.rgb, alpha);
`.trim();

const DEFAULT_COLOR_SCALE: ColorScaleConfig = {
  type: 'gradient',
  schemeName: 'FloodDepth',
  scaleMin: 0,
  scaleMax: 40,
};

const schema: LayerOptionField[] = [
  { key: 'contourDepthField', label: 'Contour depth field (inches)', type: 'fieldPicker', defaultValue: '' },
  { key: 'sensorKeyField', label: 'Sensor key field', type: 'fieldPicker', defaultValue: '' },
  { key: 'fillOpacity', label: 'Fill opacity (0–1)', type: 'number', defaultValue: 0.5 },
];

// Stable subclass. equals() compares inject by string content, so same color scale
// → same GLSL → equals() true → no shader recompile during cursor scrubbing.
const InundationExtension = CreateMathExtensionSubclass({
  name: 'FloodInundation',
  attrs: {
    contourDepth: { type: 'float' },
    currentDepth: { type: 'float' },
    fillOpacity: { type: 'float' },
  },
  uniforms: {},
  inject: {},
});

function getPolygonCoords(f: Feature): number[][][] | null {
  const g = f.geometry as Polygon | MultiPolygon;
  if (!g) {return null;}
  if (g.type === 'Polygon') {return g.coordinates as number[][][];}
  if (g.type === 'MultiPolygon') {return g.coordinates[0] as number[][][];}
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

    const colorScale: ColorScaleConfig = config.colorScale ?? DEFAULT_COLOR_SCALE;

    return [
      new SolidPolygonLayer({
        id: `flood-inundation/${config.id}`,
        data: features,
        visible: config.visible,
        pickable: false,
        filled: true,
        stroked: false,
        getPolygon: (f: Feature) => (getPolygonCoords(f)?.[0] ?? []) as any,
        getFillColor: [0, 0, 0, 255],
        getFillOpacity: fillOpacity,
        minZoom: config.minZoom,
        maxZoom: config.maxZoom,
        onClick: onFeatureClick
          ? (info: any) => info.object && onFeatureClick(info.object, info)
          : undefined,
        getContourDepth: (f: Feature) => Number(f.properties?.[contourDepthField] ?? 0),
        getCurrentDepth: (f: Feature) => lookupValues?.get(String(f.properties?.[sensorKeyField] ?? ''))?.depth ?? 0,
        extensions: [
          new InundationExtension({
            name: `floodinundation_${config.id}`,
            uniforms: {},
            inject: {
              'fs:#decl': buildInterpolateColorGlsl(colorScale),
              'fs:DECKGL_FILTER_COLOR': FS_FILTER_COLOR,
            },
          }),
        ],
        updateTriggers: {
          getContourDepth: [contourDepthField],
          getCurrentDepth: [lookupValues, sensorKeyField],
        },
        parameters: { depthTest: false },
      }),
    ];
  },
};

registerLayer(renderer);
export default renderer;
