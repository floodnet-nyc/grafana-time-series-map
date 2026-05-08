import { SolidPolygonLayer } from '@deck.gl/layers';
import type { Feature, Polygon, MultiPolygon } from 'geojson';
import { MathExtension } from '../../utils/deckgl/MathExtension';
import { buildInterpolateColorGlsl } from '../../utils/deckgl/colorScales';
import { registerLayer } from '../registry';
import type { LayerRenderContext, LayerRenderer, LayerOptionField } from '../types';
import type { ColorScaleConfig } from '../../types';

// Maximum number of unique sensor keys supported per layer.
// Sensor depths are passed as a uniform float array; must be a compile-time constant.
const MAX_SENSORS = 256;

// Per-features-array cache so we only rebuild the sensor→index mapping when
// the features array reference changes (i.e. on data/config change, not every tick).
type SensorIndexCache = { keyField: string; toIndex: Map<string, number> };
const sensorIndexCache = new WeakMap<readonly Feature[], SensorIndexCache>();

function getSensorIndexMap(features: Feature[], keyField: string): Map<string, number> {
  const hit = sensorIndexCache.get(features);
  if (hit && hit.keyField === keyField) return hit.toIndex;

  const toIndex = new Map<string, number>();
  let count = 0;
  for (const f of features) {
    const k = String(f.properties?.[keyField] ?? '');
    if (k && !toIndex.has(k)) toIndex.set(k, count++);
  }
  sensorIndexCache.set(features, { keyField, toIndex });
  return toIndex;
}

// Fragment shader: look up current depth from the per-frame uniform array using
// the polygon's stable sensor index, then compute depth-above-contour color.
// noUniformBlock mode declares this as: uniform float sensorDepths[MAX_SENSORS];
// Non-constant index for uniform arrays is valid in GLSL ES 3.00 (WebGL 2).
const FS_FILTER_COLOR = `
float currentDepth = sensorDepths[int(vInstanceSensorIndex + 0.5)];
float depthDiff = currentDepth - vInstanceContourDepth;
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

    const colorScale: ColorScaleConfig = config.colorScale ?? DEFAULT_COLOR_SCALE;
    const fsDecl = buildInterpolateColorGlsl(colorScale);

    // ── Sensor index mapping (stable per data load, O(1) during scrubbing) ──────
    const toIndex = getSensorIndexMap(features, sensorKeyField);

    // ── Current depths uniform array (O(N) per tick, no vertex expansion) ───────
    // A fresh Float32Array is created each tick so luma.gl detects the change and
    // uploads it. At MAX_SENSORS=256 floats this is 1 KB — negligible.
    const sensorDepths = new Float32Array(MAX_SENSORS);
    if (lookupValues) {
      for (const [key, idx] of toIndex) {
        if (idx < MAX_SENSORS) {
          sensorDepths[idx] = lookupValues.get(key)?.depth ?? 0;
        }
      }
    }

    return [
      new SolidPolygonLayer({
        id: config.id,
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
        // Stable per-polygon accessor — only re-uploaded when sensorKeyField changes,
        // NOT on every cursor tick. This is the key perf fix: eliminates the O(vertex-count)
        // attribute expansion that previously ran every tick for getCurrentDepth.
        getSensorIndex: (f: Feature) => toIndex.get(String(f.properties?.[sensorKeyField] ?? '')) ?? 0,
        getContourDepth: (f: Feature) => Number(f.properties?.[contourDepthField] ?? 0),
        extensions: [
          new MathExtension({
            name: `floodinundation_${config.id}`,
            attrs: {
              sensorIndex: { type: 'float' },    // stable — one per polygon
              contourDepth: { type: 'float' },   // stable — one per polygon
              fillOpacity: { type: 'float' },    // stable — one per polygon
            },
            uniforms: {
              // sensorDepths is updated each frame via MathExtension.draw() →
              // setShaderModuleProps(). luma.gl uploads the Float32Array as-is.
              // Cost: O(MAX_SENSORS) uniform upload, zero vertex expansion.
              sensorDepths: {
                type: 'float',
                utype: 'f32' as any,
                value: sensorDepths,  // fresh Float32Array each tick
                length: MAX_SENSORS,
              },
            },
            noUniformBlock: true,  // declares as: uniform float sensorDepths[256];
            inject: {
              'fs:#decl': fsDecl,
              'fs:DECKGL_FILTER_COLOR': FS_FILTER_COLOR,
            },
          }),
        ],
        updateTriggers: {
          getContourDepth: [contourDepthField],
          // sensorIndex only changes when the field name changes — never during scrubbing.
          getSensorIndex: [sensorKeyField],
          getFillOpacity: [fillOpacity],
        },
        parameters: { depthTest: false },
      }),
    ];
  },
};

registerLayer(renderer);
export default renderer;
