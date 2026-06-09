import { SolidPolygonLayer } from '@deck.gl/layers';
import type { BaseLayerConfig, LayerDefinition, LayerRenderContext } from '../types';
import type { SourceRef } from '../../types';
import { CreateMathExtensionSubclass } from '../../utils/deckgl/extensions/MathExtension';
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
    const { config, data, getAccessors } = context;
    const options = config.settings;
    const valueField = config.colorScale?.field || config.shader?.value;
    const hasScheme = !!(config.colorScale?.schemeName || config.colorScale?.type === 'threshold');
    const useShader = !!(config.shader?.enabled && hasScheme && valueField?.field);
    const extensions: any[] = [];
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
        })
      );
    }

    const commonProps = createCommonLayerProps(context);
    const [getElevation, updatesElevation] = getAccessors.number(options.elevation, options.elevationScale);
    const [getValue, updatesValue] = useShader ? getAccessors.number(valueField) : [undefined, []];
    const [getPolygon] = getAccessors.polygon();
    const getColor = buildColorAccessor(config.colorScale, [0, 155, 104, 255], getValue as any);
    const fillOpacity = options.fillOpacity;
    return [
      new SolidPolygonLayer({
        ...commonProps,
        data,
        filled: true,
        extruded: options.extruded,
        getPolygon: ((datum: any, ctx: any) => getPolygon(datum, ctx)[0] ?? []) as any,
        getElevation,
        getFillColor: useShader
          ? [0, 0, 0, fillOpacity]
          : (datum: any, ctx: any) => {
              const c = (getColor as (value: any, context: any) => [number, number, number, number])(datum, ctx);
              return [c[0], c[1], c[2], fillOpacity] as [number, number, number, number];
            },
        ...(useShader ? { getValue } : {}),
        extensions: [...commonProps.extensions, ...extensions],
        updateTriggers: {
          ...commonProps.updateTriggers,
          getFillColor: [config.colorScale, options.fillOpacity],
          getElevation: updatesElevation,
          ...(useShader ? { getValue: updatesValue } : {}),
        },
      }),
    ];
  },
};

export default polygonLayerDefinition;
