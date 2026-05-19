import { ScatterplotLayer, TextLayer } from '@deck.gl/layers';
import { DataFilterExtension } from '@deck.gl/extensions';
import type { Feature } from 'geojson';
import type { BaseLayerConfig, LayerDefinition, LayerRenderContext } from '../types';
import { CreateMathExtensionSubclass } from '../../utils/deckgl/MathExtension';
import { buildColorAccessor, buildInterpolateColorGlsl, DEFAULT_VS_FILTER_COLOR } from '../../utils/deckgl/colorScales';
import { createBaseLayerConfig, section } from '../defaults';
import CollisionFilterExtension from '../../utils/deckgl/CollisionFilterExtension';
import {
  createCommonLayerProps,
  createLineSelectionAccessors,
  getFeaturePosition,
} from '../utils';
import { autoDecimalsText } from 'layers/text';
import { AccessorContext } from '@deck.gl/core';
export interface ScatterplotLayerSettings {
  radiusMinPixels: number;
  radiusMaxPixels: number;
  radiusField: string;
  radiusScale: number;
  stroked: boolean;
  showLabels: boolean;
  labelField: string;
}

export type ScatterplotLayerConfig = BaseLayerConfig<'scatterplot', ScatterplotLayerSettings>;


const ScatterColorExtension = CreateMathExtensionSubclass({
  name: 'ScatterColor',
  attrs: { value: { type: 'float' } },
  uniforms: {},
  inject: {},
});

const defaultSettings: ScatterplotLayerSettings = {
  radiusMinPixels: 4,
  radiusMaxPixels: 20,
  radiusField: '',
  radiusScale: 1,
  stroked: true,
  showLabels: false,
  labelField: '',
};

export const scatterplotLayerDefinition: LayerDefinition<ScatterplotLayerConfig> = {
  type: 'scatterplot',
  label: 'Scatter Plot',
  createDefaultConfig(index) {
    return createBaseLayerConfig('scatterplot', 'Scatter Plot', index, defaultSettings);
  },
  editorSections: [
    section('Point', [
      { key: 'radiusMinPixels', label: 'Min radius (px)', type: 'number', defaultValue: 4 },
      { key: 'radiusMaxPixels', label: 'Max radius (px)', type: 'number', defaultValue: 20 },
      { key: 'radiusField', label: 'Radius field', type: 'fieldPicker', defaultValue: '' },
      { key: 'radiusScale', label: 'Radius scale', type: 'number', defaultValue: 1 },
      { key: 'stroked', label: 'Stroke outline', type: 'boolean', defaultValue: true },
    ]),
    section('Text', [
      { key: 'showLabels', label: 'Show labels', type: 'boolean', defaultValue: false },
      { key: 'labelField', label: 'Label field', type: 'fieldPicker', defaultValue: '' },
    ]),
  ],
  renderLayers(context: LayerRenderContext<ScatterplotLayerConfig>) {
    const { config, features, timeFilterFlags, selectedKey, getAccessor, getNumericAccessor } = context;
    const options = config.settings;

    const valueField =
      config.colorScale?.field ||
      config.shader?.valueField ||
      '';

    const hasScheme = !!(config.colorScale?.schemeName || config.colorScale?.type === 'threshold');
    const useShader = !!(hasScheme && valueField);

    const shaderExtensions: unknown[] = [];
    if (useShader) {
      const autoDecl = buildInterpolateColorGlsl(config.colorScale!);
      const userDecl = config.shader?.vsDecl?.trim() ?? '';
      const vsFilterColor = config.shader?.vsFilterColor?.trim() || DEFAULT_VS_FILTER_COLOR;
      shaderExtensions.push(new ScatterColorExtension({
        name: `shader_${config.id}`,
        uniforms: {},
        inject: {
          'vs:#decl': userDecl ? `${autoDecl}\n\n${userDecl}` : autoDecl,
          'vs:DECKGL_FILTER_COLOR': vsFilterColor,
        },
      }));
    }

    const commonProps = createCommonLayerProps(context);
    const getColor = buildColorAccessor(config.colorScale);
    const isSelected = getAccessor(config.selectionKeyField);
    const lineAccessors = createLineSelectionAccessors(isSelected);

    // if (timeFilterFlags) console.log(features.map((f) => f.properties?.depth_inches));
    const getRadius = getNumericAccessor(options.radiusField, options.radiusScale);
    const getValue = useShader ? getNumericAccessor(valueField) : undefined;

    const layers: any[] = [
      new ScatterplotLayer({
        ...commonProps,
        id: `scatterplot/${config.id}`,
        data: features,
        radiusMinPixels: options.radiusMinPixels,
        radiusMaxPixels: options.radiusMaxPixels,
        radiusUnits: 'pixels' as const,
        stroked: options.stroked,
        filled: true,
        lineWidthMinPixels: 0,
        getPosition: (f: Feature) => getFeaturePosition(f, config),
        getLineColor: lineAccessors.getLineColor ?? [0, 0, 0, 0],
        getLineWidth: lineAccessors.getLineWidth ?? 0,
        getFillColor: useShader ? [0, 0, 0, 255] : getColor,
        getRadius: getRadius ?? options.radiusMinPixels,
        ...(useShader ? { getValue } : {}),
        extensions: [...commonProps.extensions, ...(shaderExtensions as any[])],
        updateTriggers: {
          ...commonProps.updateTriggers,
          getLineColor: [selectedKey],
          getLineWidth: [selectedKey],
          ...(useShader ? { getValue: [selectedKey, valueField, config.colorScale] } : {}),
        },
        parameters: { blend: true, depthTest: false },
      }),
    ];

    if (options.showLabels) {
      const getText = getAccessor(options.labelField || valueField, '');
      const getCollisionPriority = getNumericAccessor(config.elevation?.field, config.elevation ? config.elevation.scale : 1);
      const getDecimals = (v: number) => (v > 6 ? 0 : 1);
      layers.push(
        new TextLayer({
          id: `scatterplot-labels/${config.id}`,
          data: features,
          visible: config.visible,
          pickable: false,
          getPosition: (f: Feature) => getFeaturePosition(f, config, 2),
          getText: getText ? (f: Feature, ctx: AccessorContext<Feature>) => autoDecimalsText(getText(f, ctx), true) : undefined,
          getSize: getRadius ? (f: Feature, ctx: AccessorContext<Feature>) => {
            const v = getRadius(f, ctx);
            const decs = getDecimals(v);
            const chars = String(v.toFixed(decs)).length;
            return options.radiusMinPixels + Math.max(0, Math.min(options.radiusMaxPixels, v * options.radiusScale)) / chars;
          } : 12,
          getColor: [255, 255, 255, 220],
          getAlignmentBaseline: 'center',
          getAnchor: 'middle',
          billboard: true,
          fontWeight: 900,
          fontFamily: 'Helvetica Neue, Verdana, Roboto, Helvetica, sans-serif',
          minZoom: config.minZoom,
          maxZoom: config.maxZoom,
          getFilterValue: (f: any) => (timeFilterFlags[f.__idx] ? 1 : -1),
          filterRange: [1, 1] as [number, number],
          collisionGroup: 'scatter-labels',
          collisionTestProps: { sizeScale: 2 },
          getCollisionPriority: getCollisionPriority ?? 0,
          extensions: [new DataFilterExtension({ filterSize: 1 }), new CollisionFilterExtension()],
          updateTriggers: { getFilterValue: [timeFilterFlags] },
          parameters: { depthTest: false },
          polygonOffset: 1,
        }),
      );
    }

    return layers;
  },
};

export default scatterplotLayerDefinition;
