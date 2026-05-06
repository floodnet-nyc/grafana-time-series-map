import { SolidPolygonLayer } from '@deck.gl/layers';
import { DataFilterExtension } from '@deck.gl/extensions';
import type { Feature, Polygon, MultiPolygon } from 'geojson';
import { MathExtension } from '../../utils/deckgl/MathExtension';
import { buildColorAccessor, buildInterpolateColorGlsl, DEFAULT_VS_FILTER_COLOR } from '../../utils/deckgl/colorScales';
import { registerLayer } from '../registry';
import type { LayerRenderContext, LayerRenderer, LayerOptionField } from '../types';

const schema: LayerOptionField[] = [
  { key: 'fillOpacity', label: 'Fill opacity (0-255)', type: 'number', defaultValue: 180 },
  { key: 'extruded', label: 'Extruded (3D)', type: 'boolean', defaultValue: false },
  { key: 'elevationField', label: 'Elevation field', type: 'fieldPicker', defaultValue: '' },
  { key: 'elevationScale', label: 'Elevation scale', type: 'number', defaultValue: 1 },
];

function getPolygonCoords(f: Feature): number[][][] | null {
  const g = f.geometry as Polygon | MultiPolygon;
  if (!g) return null;
  if (g.type === 'Polygon') return g.coordinates as number[][][];
  if (g.type === 'MultiPolygon') return g.coordinates[0] as number[][][];
  return null;
}

const renderer: LayerRenderer = {
  type: 'polygon',
  label: 'Polygon (filled)',
  defaultOptions: {
    fillOpacity: 180,
    extruded: false,
    elevationField: '',
    elevationScale: 1,
  },
  optionsSchema: schema,

  renderLayers({ config, features, timeFilterFlags, onFeatureClick }: LayerRenderContext) {
    const opts = config.options as Record<string, any>;
    const valueField = config.colorScale?.field || config.fieldMappings.find((m) => m.alias === 'value')?.fieldName || '';
    const hasScheme = !!(config.colorScale?.schemeName || config.colorScale?.presetName);
    const useShader = !!(hasScheme && valueField);

    const extensions: any[] = [new DataFilterExtension({ filterSize: 1 })];
    if (useShader) {
      const autoDecl = buildInterpolateColorGlsl(config.colorScale!);
      const userDecl = config.shader?.vsDecl?.trim() ?? '';
      const vsDecl = userDecl ? `${autoDecl}\n\n${userDecl}` : autoDecl;
      const vsFilterColor = config.shader?.vsFilterColor?.trim() || DEFAULT_VS_FILTER_COLOR;
      extensions.push(
        new MathExtension({
          name: `shader_${config.id}`,
          attrs: { value: { type: 'float' } },
          uniforms: {},
          inject: {
            'vs:#decl': vsDecl,
            'vs:DECKGL_FILTER_COLOR': vsFilterColor,
          },
        }),
      );
    }

    const getColor = buildColorAccessor(config.colorScale);
    const fillOpacity = opts.fillOpacity ?? 180;

    return [
      new SolidPolygonLayer({
        id: config.id,
        data: features.filter((f) => getPolygonCoords(f) !== null),
        visible: config.visible,
        opacity: config.opacity,
        pickable: config.pickable ?? false,
        filled: true,
        extruded: opts.extruded ?? false,
        getPolygon: (f: Feature) => getPolygonCoords(f)![0] as any,
        getFillColor: useShader
          ? [0, 0, 0, fillOpacity]
          : (f: Feature) => {
              const c = (getColor as (f: Feature) => [number, number, number, number])(f);
              return [c[0], c[1], c[2], fillOpacity] as [number, number, number, number];
            },
        getElevation: opts.elevationField
          ? (f: Feature) =>
              Number(f.properties?.[opts.elevationField] ?? 0) * (opts.elevationScale ?? 1)
          : 0,
        minZoom: config.minZoom,
        maxZoom: config.maxZoom,
        onClick: onFeatureClick
          ? (info: any) => info.object && onFeatureClick(info.object, info)
          : undefined,
        getFilterValue: (f: any) => (timeFilterFlags[f.__idx] ? 1 : -1),
        filterRange: [1, 1] as [number, number],
        ...(useShader
          ? { getValue: (f: Feature) => Number(f.properties?.[valueField] ?? 0) }
          : {}),
        extensions,
        updateTriggers: { getFilterValue: [timeFilterFlags] },
        parameters: { depthTest: false },
      }),
    ];
  },
};

registerLayer(renderer);
export default renderer;
