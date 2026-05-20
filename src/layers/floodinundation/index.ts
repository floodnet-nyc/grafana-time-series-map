import { SolidPolygonLayer } from '@deck.gl/layers';
import type { Feature, MultiPolygon, Polygon } from 'geojson';
import type { ColorScaleConfig, SourceRef } from '../../types';
import type { BaseLayerConfig, LayerDefinition, LayerRenderContext } from '../types';
import { CreateMathExtensionSubclass } from '../../utils/deckgl/extensions/MathExtension';
import { buildInterpolateColorGlsl } from '../../utils/deckgl/colorScales';
import { createBaseLayerConfig, createSourceRef, section } from '../defaults';
import { createCommonLayerProps } from 'layers/utils';

export interface FloodInundationLayerSettings {
  depthDiff: SourceRef;
  elevationScale: number;
  depthTest: boolean;
  fillOpacity: number;
}

export type FloodInundationLayerConfig = BaseLayerConfig<'flood-inundation', FloodInundationLayerSettings>;


const VS_FILTER_COLOR = `
float depthDiff = instanceDepthDiff;
float alpha = smoothstep(0.0, 3.0, depthDiff) * instanceFillOpacity;
vec4 c = interpolateColor(depthDiff);
if (solidPolygon.extruded) {
  c.rgb = lighting_getLightColor(c.rgb, project.cameraPosition, geometry.position.xyz, geometry.normal);
}
color = vec4(c.rgb, alpha);
`.trim();

const DEFAULT_COLOR_SCALE: ColorScaleConfig = {
  type: 'gradient',
  schemeName: 'FloodDepth',
  scaleMin: 0,
  scaleMax: 40,
};

const InundationExtension = CreateMathExtensionSubclass({
  name: 'FloodInundation',
  attrs: {
    depthDiff: { type: 'float' },
    fillOpacity: { type: 'float' },
  },
  uniforms: {},
  inject: {},
});

function getPolygonCoords(f: Feature): number[][][] | null {
  const g = f.geometry as Polygon | MultiPolygon;
  if (!g) {
    return null;
  }
  if (g.type === 'Polygon') {
    return g.coordinates as number[][][];
  }
  if (g.type === 'MultiPolygon') {
    return g.coordinates[0] as number[][][];
  }
  return null;
}

// function getDerivedNumber(feature: Feature, derivedValues: Array<Record<string, unknown>> | undefined, field: string): number {
//   const index = (feature as Feature & { __idx?: number }).__idx;
//   return Number(derivedValues?.[index ?? -1]?.[field] ?? 0);
// }

const defaultSettings: FloodInundationLayerSettings = {
  depthDiff: createSourceRef('depthDiff'),
  elevationScale: 1,
  depthTest: false,
  fillOpacity: 0.5,
};

export const floodInundationLayerDefinition: LayerDefinition<FloodInundationLayerConfig> = {
  type: 'flood-inundation',
  label: 'Flood Inundation',
  createDefaultConfig(index) {
    return createBaseLayerConfig('flood-inundation', 'Flood Inundation', index, defaultSettings, {
      type: 'geojson',
      value: createSourceRef('geometry'),
    });
  },
  editorSections: [
    section('Flood Inundation', [
      { key: 'depthDiff', label: 'Depth difference field', type: 'fieldPicker', defaultValue: createSourceRef('depthDiff') },
      { key: 'elevationScale', label: 'Elevation scale', type: 'number', defaultValue: 1 },
      { key: 'depthTest', label: 'Depth test', type: 'boolean', defaultValue: false },
      { key: 'fillOpacity', label: 'Fill opacity (0–1)', type: 'number', defaultValue: 0.5 },
    ]),
  ],
  renderLayers(context: LayerRenderContext<FloodInundationLayerConfig>) {
    const { config, features, getAccessors } = context;
    const options = config.settings;
    const colorScale: ColorScaleConfig = config.colorScale ?? DEFAULT_COLOR_SCALE;
    const commonProps = createCommonLayerProps(context);
    const [getElevation, updatesElevation] = getAccessors.number(options.depthDiff, 0);
    return [
      new SolidPolygonLayer({
        ...commonProps,
        data: features,
        filled: true,
        stroked: false,
        getPolygon: (f: Feature) => (getPolygonCoords(f)?.[0] ?? []) as any,
        getFillColor: [0, 0, 0, 255],
        getFillOpacity: options.fillOpacity,
        getDepthDiff: getElevation ?? 0,
        getElevation: getElevation ?? 0,
        elevationScale: options.elevationScale,
        extensions: [
          new InundationExtension({
            name: `floodinundation_${config.id}`,
            uniforms: {},
            inject: {
              'vs:#decl': buildInterpolateColorGlsl(colorScale),
              'vs:DECKGL_FILTER_COLOR': VS_FILTER_COLOR,
            },
          }),
        ],
        updateTriggers: {
          ...commonProps.updateTriggers,
          getDepthDiff: updatesElevation,
        },
      }),
    ];
  },
};

export default floodInundationLayerDefinition;
