import { ScatterplotLayer, TextLayer } from '@deck.gl/layers';
// import { DataFilterExtension } from '@deck.gl/extensions';
import type { BaseLayerConfig, LayerDefinition, LayerRenderContext } from '../types';
import type { SourceRef } from '../../types';
import { CreateMathExtensionSubclass } from '../../utils/deckgl/extensions/MathExtension';
import { buildColorAccessor, buildInterpolateColorGlsl, DEFAULT_VS_FILTER_COLOR } from '../../utils/deckgl/colorScales';
import { createBaseLayerConfig, createSourceRef, section } from '../defaults';
import CollisionFilterExtension from '../../utils/deckgl/extensions/CollisionFilterExtension';
import { DEFAULT_SELECTED_COLOR, createCommonLayerProps } from '../utils';
import { autoDecimalsText } from 'layers/text';
import type { AccessorContext } from '@deck.gl/core';
import type { LayerDatum } from '../../utils/dataframe/layerTable';
export interface ScatterplotLayerSettings {
  radiusMinPixels: number;
  radiusMaxPixels: number;
  radius: SourceRef;
  radiusScale: number;
  elevation: SourceRef;
  elevationScale: number;
  depthTest: boolean;
  stroked: boolean;
  antialiasing?: boolean;
  showLabels: boolean;
  label: SourceRef;
  labelCollisionTestScale?: number;
  labelCollisionPriorityScale?: number;
  labelElevationOffset?: number;
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
  radius: createSourceRef(),
  radiusScale: 1,
  elevation: createSourceRef(),
  elevationScale: 1,
  depthTest: false,
  stroked: true,
  antialiasing: true,
  showLabels: false,
  label: createSourceRef(),
  labelCollisionTestScale: 1.2,
  labelCollisionPriorityScale: 1,
  labelElevationOffset: 6,
};

export const scatterplotLayerDefinition: LayerDefinition<ScatterplotLayerConfig, LayerDatum> = {
  type: 'scatterplot',
  label: 'Scatter Plot',
  createDefaultConfig(index) {
    return createBaseLayerConfig('scatterplot', 'Scatter Plot', index, defaultSettings);
  },
  editorSections: [
    section('Point', [
      { key: 'radiusMinPixels', label: 'Min radius (px)', type: 'number', defaultValue: 4 },
      { key: 'radiusMaxPixels', label: 'Max radius (px)', type: 'number', defaultValue: 20 },
      { key: 'radius', label: 'Radius field', type: 'fieldPicker', defaultValue: createSourceRef() },
      { key: 'radiusScale', label: 'Radius scale', type: 'number', defaultValue: 1 },
      { key: 'elevation', label: 'Elevation field', type: 'fieldPicker', defaultValue: createSourceRef() },
      { key: 'elevationScale', label: 'Elevation scale', type: 'number', defaultValue: 1 },
      { key: 'depthTest', label: 'Depth test', type: 'boolean', defaultValue: false },
      { key: 'stroked', label: 'Stroke outline', type: 'boolean', defaultValue: true },
      { key: 'antialiasing', label: 'Antialiasing', type: 'boolean', defaultValue: true },
    ]),
    section('Text', [
      { key: 'showLabels', label: 'Show labels', type: 'boolean', defaultValue: false },
      { key: 'label', label: 'Label field', type: 'fieldPicker', defaultValue: createSourceRef() },
      { key: 'labelCollisionTestScale', label: 'Label collision test scale', type: 'number', defaultValue: 1.2 },
      { key: 'labelCollisionPriorityScale', label: 'Label collision priority scale', type: 'number', defaultValue: 1 },
      { key: 'labelElevationOffset', label: 'Label elevation offset (px)', type: 'number', defaultValue: 6 },
    ]),
  ],
  renderLayers(context: LayerRenderContext<ScatterplotLayerConfig>) {
    const { config, data, selectedKey, getAccessor, getAccessors } = context;
    const options = config.settings;
    const valueField = config.colorScale?.field || config.shader?.value;

    const hasScheme = !!(config.colorScale?.schemeName || config.colorScale?.type === 'threshold');
    const useShader = !!(config.shader?.enabled && hasScheme && valueField?.field);

    const shaderExtensions: unknown[] = [];
    if (useShader) {
      const autoDecl = buildInterpolateColorGlsl(config.colorScale!);
      const userDecl = config.shader?.vsDecl?.trim() ?? '';
      const vsFilterColor = config.shader?.vsFilterColor?.trim() || DEFAULT_VS_FILTER_COLOR;
      shaderExtensions.push(
        new ScatterColorExtension({
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
    const [getColorValue, updateColorValue] = config.colorScale?.field
      ? getAccessors.number(config.colorScale.field)
      : [undefined, []];
    const getColor = buildColorAccessor<LayerDatum>(config.colorScale, [0, 155, 104, 255], getColorValue);

    const [getSelection, updateSelection] = getAccessor(config.selectionKey, undefined);
    const getLineColor = (datum: LayerDatum, ctx: AccessorContext<LayerDatum>) =>
      (selectedKey != null
        ? String(getSelection?.(datum, ctx) ?? '') === selectedKey
          ? (config.selectionColor ?? DEFAULT_SELECTED_COLOR)
          : [200, 200, 240, 0]
        : [0, 0, 0, 0]) as [number, number, number, number];
    const getLineWidth = (datum: LayerDatum, ctx: AccessorContext<LayerDatum>) =>
      selectedKey != null ? (String(getSelection?.(datum, ctx) ?? '') === selectedKey ? 3 : 0) : 0;

    const [getRadius, updateRadius] = getAccessors.number(options.radius, options.radiusScale);
    const [getValue, updateValue] = useShader ? getAccessors.number(valueField) : [undefined, []];
    const [getElevation, updateElevation] = getAccessors.number(options.elevation, options.elevationScale);
    const [getPosition, updatesPosition] = getAccessors.pointPosition([0, 0, 0], getElevation);
    const [getLabelPosition, updatesLabelPosition] = getAccessors.pointPosition([0, 0, 0], getElevation, options.labelElevationOffset);

    const layers: any[] = [
      new ScatterplotLayer({
        ...commonProps,
        data,
        radiusMinPixels: options.radiusMinPixels,
        radiusMaxPixels: options.radiusMaxPixels,
        radiusUnits: 'pixels' as const,
        lineWidthUnits: 'pixels' as const,
        stroked: options.stroked,
        filled: true,
        antialiasing: options.antialiasing ?? true,
        lineWidthMinPixels: 0,
        lineWidthMaxPixels: 6,
        getPosition,
        getLineColor: getLineColor ?? [0, 0, 0, 0],
        getLineWidth: getLineWidth ?? 0,
        getFillColor: useShader ? [0, 0, 0, 255] : getColor,
        getRadius: getRadius ?? options.radiusMinPixels,
        ...(useShader ? { getValue } : {}),
        extensions: [...commonProps.extensions, ...(shaderExtensions as any[])],
        updateTriggers: {
          ...commonProps.updateTriggers,
          getPosition: [...updatesPosition, ...updateElevation],
          getLineColor: updateSelection,
          getLineWidth: updateSelection,
          getRadius: updateRadius,
          getFillColor: updateColorValue,
          ...(useShader ? { getValue: [...updateValue, selectedKey, config.colorScale] } : {}),
        },
        parameters: { blend: true, depthTest: false },
        getPolygonOffset: () => ([-1, 100] as [number, number]),
      }),
    ];

    if (options.showLabels) {
      const [getText, updateText] = getAccessor(options.label?.field ? options.label : valueField, '');
      const [getCollisionPriorityValue, updateCollisionPriority] = getAccessors.number(options.elevation, 1);
      const getCollisionPriority = getCollisionPriorityValue
        ? (datum: LayerDatum, ctx: AccessorContext<LayerDatum>) => {
            return (getCollisionPriorityValue(datum, ctx) ?? 0) * (options.labelCollisionPriorityScale ?? 1);
          }
        : undefined;
      layers.push(
        new TextLayer({
          ...commonProps,
          id: `scatterplot-labels/${config.id}`,
          data,
          visible: config.visible,
          pickable: false,
          getPosition: getLabelPosition,
          getText: getText
            ? (datum: LayerDatum, ctx: AccessorContext<LayerDatum>) => autoDecimalsText(getText(datum, ctx), true)
            : undefined,
          getSize: getRadius
            ? (datum: LayerDatum, ctx: AccessorContext<LayerDatum>) => {
                const v = getRadius(datum, ctx);
                return options.radiusMinPixels + Math.max(0, Math.min(options.radiusMaxPixels, v * options.radiusScale)) / 2;
              }
            : 12,
          getColor: [255, 255, 255, 220],
          getAlignmentBaseline: 'center',
          getTextAnchor: 'middle',
          billboard: false,
          fontWeight: 900,
          fontFamily: 'Helvetica Neue, Verdana, Roboto, Helvetica, sans-serif',
          minZoom: config.minZoom,
          maxZoom: config.maxZoom,
          collisionGroup: 'scatter-labels',
          collisionTestProps: {
            sizeScale: options.labelCollisionTestScale ?? 1.6,
            background: true,
            backgroundPadding: [4, 2, 4, 2] as [number, number, number, number],
            getBackgroundColor: [255, 255, 255, 255] as [number, number, number, number],
          },
          getCollisionPriority: getCollisionPriority ?? 0,
          extensions: [
            ...commonProps.extensions, 
            new CollisionFilterExtension()
          ],
          updateTriggers: {
            ...commonProps.updateTriggers,
            getPosition: [...updatesLabelPosition, ...updateElevation],
            getText: updateText,
            getCollisionPriority: [...updateCollisionPriority, options.labelCollisionPriorityScale ?? 1],
          },
          parameters: { depthTest: false, depthBias: -12 },
          // getPolygonOffset: () => [-1, 100] as [number, number],
          getPolygonOffset: null,
        })
      );
    }

    return layers;
  },
};

export default scatterplotLayerDefinition;
