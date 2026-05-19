import { SolidPolygonLayer } from '@deck.gl/layers';
import { DataFilterExtension } from '@deck.gl/extensions';
import type { Feature, MultiPolygon, Polygon } from 'geojson';
import type { BaseLayerConfig, LayerDefinition, LayerRenderContext } from '../types';
import type { SourceRef } from '../../types';
import { CreateMathExtensionSubclass } from '../../utils/deckgl/MathExtension';
import { buildColorAccessor, buildInterpolateColorGlsl, DEFAULT_VS_FILTER_COLOR } from '../../utils/deckgl/colorScales';
import { createBaseLayerConfig, createSourceRef, section } from '../defaults';
import { createCommonLayerProps } from 'layers/utils';

export interface PolygonLayerSettings {
  fillOpacity: number;
  extruded: boolean;
  elevation: SourceRef;
  elevationScale: number;
}

export type PolygonLayerConfig = BaseLayerConfig<'polygon', PolygonLayerSettings>;


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
  elevation: createSourceRef(),
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
      { key: 'elevation', label: 'Elevation field', type: 'fieldPicker', defaultValue: createSourceRef() },
      { key: 'elevationScale', label: 'Elevation scale', type: 'number', defaultValue: 1 },
    ]),
  ],
  renderLayers(context: LayerRenderContext<PolygonLayerConfig>) {
    const { config, features, timeFilterFlags, getNumericAccessor } = context;
    const options = config.settings;
    const valueField = config.colorScale?.field || config.shader?.value;
    const hasScheme = !!(config.colorScale?.schemeName || config.colorScale?.type === 'threshold');
    const useShader = !!(hasScheme && valueField?.field);
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

    const commonProps = createCommonLayerProps(context);
    const [getElevation, updatesElevation] = getNumericAccessor(options.elevation, options.elevationScale);
    const [getValue, updatesValue] = useShader ? getNumericAccessor(valueField) : [undefined, []];
    const getColor = buildColorAccessor(config.colorScale, [0, 155, 104, 255], getValue);
    const fillOpacity = options.fillOpacity;
    return [
      new SolidPolygonLayer({
        ...commonProps,
        data: features,
        filled: true,
        extruded: options.extruded,
        getPolygon: (f: Feature) => (getPolygonCoords(f)?.[0] ?? []) as any,
        getElevation,
        getFillColor: useShader
          ? [0, 0, 0, fillOpacity]
          : (f: Feature) => {
              const c = (getColor as (feature: Feature) => [number, number, number, number])(f);
              return [c[0], c[1], c[2], fillOpacity] as [number, number, number, number];
            },
        ...(useShader ? { getValue } : {}),
        extensions: [commonProps.extensions, ...extensions],
        updateTriggers: { 
          ...commonProps.updateTriggers,
          getFilterValue: [timeFilterFlags],
          getFillColor: [config.colorScale, options.fillOpacity],
          getElevation: updatesElevation,
          ...(useShader ? { getValue: updatesValue } : {}),
        },
      }),
    ];
  },
};

export default polygonLayerDefinition;
