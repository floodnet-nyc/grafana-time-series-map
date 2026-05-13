import { SolidPolygonLayer } from '@deck.gl/layers';
import { DataFilterExtension } from '@deck.gl/extensions';
import type { Feature, MultiPolygon, Polygon } from 'geojson';
import type { PolygonLayerConfig, PolygonLayerSettings, LayerDefinition, LayerRenderContext } from '../types';
import { CreateMathExtensionSubclass } from '../../utils/deckgl/MathExtension';
import { buildColorAccessor, buildInterpolateColorGlsl, DEFAULT_VS_FILTER_COLOR } from '../../utils/deckgl/colorScales';
import { createBaseLayerConfig, section } from '../defaults';

const PolygonColorExtension = CreateMathExtensionSubclass({
  name: 'PolygonColor',
  attrs: { value: { type: 'float' } },
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

const defaultSettings: PolygonLayerSettings = {
  fillOpacity: 180,
  extruded: false,
  elevationField: '',
  elevationScale: 1,
};

export const polygonLayerDefinition: LayerDefinition<PolygonLayerConfig> = {
  type: 'polygon',
  label: 'Polygon',
  createDefaultConfig(index) {
    return createBaseLayerConfig('polygon', 'Polygon', index, defaultSettings);
  },
  editorSections: [
    section('Polygon', [
      { key: 'fillOpacity', label: 'Fill opacity (0-255)', type: 'number', defaultValue: 180 },
      { key: 'extruded', label: 'Extruded (3D)', type: 'boolean', defaultValue: false },
      { key: 'elevationField', label: 'Elevation field', type: 'fieldPicker', defaultValue: '' },
      { key: 'elevationScale', label: 'Elevation scale', type: 'number', defaultValue: 1 },
    ]),
  ],
  renderLayers({ config, features, timeFilterFlags, onFeatureClick }: LayerRenderContext<PolygonLayerConfig>) {
    const options = config.settings;
    const valueField = config.colorScale?.field || config.fieldMappings.find((m) => m.alias === 'value')?.fieldName || '';
    const hasScheme = !!(config.colorScale?.schemeName || config.colorScale?.type === 'threshold');
    const useShader = !!(hasScheme && valueField);
    const extensions: any[] = [new DataFilterExtension({ filterSize: 1 })];
    if (useShader) {
      const autoDecl = buildInterpolateColorGlsl(config.colorScale!);
      const userDecl = config.shader?.vsDecl?.trim() ?? '';
      const vsFilterColor = config.shader?.vsFilterColor?.trim() || DEFAULT_VS_FILTER_COLOR;
      extensions.push(
        new PolygonColorExtension({
          name: `shader_${config.id}`,
          uniforms: {},
          inject: {
            'vs:#decl': userDecl ? `${autoDecl}\n\n${userDecl}` : autoDecl,
            'vs:DECKGL_FILTER_COLOR': vsFilterColor,
          },
        }),
      );
    }
    const getColor = buildColorAccessor(config.colorScale);
    const fillOpacity = options.fillOpacity;
    return [
      new SolidPolygonLayer({
        id: `polygon/${config.id}`,
        data: features,
        visible: config.visible,
        opacity: config.opacity,
        pickable: config.pickable ?? false,
        filled: true,
        extruded: options.extruded,
        getPolygon: (f: Feature) => (getPolygonCoords(f)?.[0] ?? []) as any,
        getFillColor: useShader
          ? [0, 0, 0, fillOpacity]
          : (f: Feature) => {
              const c = (getColor as (feature: Feature) => [number, number, number, number])(f);
              return [c[0], c[1], c[2], fillOpacity] as [number, number, number, number];
            },
        getElevation: options.elevationField ? (f: Feature) => Number(f.properties?.[options.elevationField] ?? 0) * options.elevationScale : 0,
        minZoom: config.minZoom,
        maxZoom: config.maxZoom,
        onClick: onFeatureClick ? (info: any) => info.object && onFeatureClick(info.object, info) : undefined,
        getFilterValue: (f: any) => (timeFilterFlags[f.__idx] ? 1 : -1),
        filterRange: [1, 1] as [number, number],
        ...(useShader ? { getValue: (f: Feature) => Number(f.properties?.[valueField] ?? 0) } : {}),
        extensions,
        updateTriggers: { getFilterValue: [timeFilterFlags] },
        parameters: { depthTest: false },
      }),
    ];
  },
};

export default polygonLayerDefinition;
