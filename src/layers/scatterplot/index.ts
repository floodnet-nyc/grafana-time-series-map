import { ScatterplotLayer, TextLayer } from '@deck.gl/layers';
import { DataFilterExtension } from '@deck.gl/extensions';
import type { Feature } from 'geojson';
import type { BaseLayerConfig, LayerDefinition, LayerRenderContext } from '../types';
import type { SourceRef } from '../../types';
import { CreateMathExtensionSubclass } from '../../utils/deckgl/MathExtension';
import { buildColorAccessor, buildInterpolateColorGlsl, DEFAULT_VS_FILTER_COLOR } from '../../utils/deckgl/colorScales';
import { createBaseLayerConfig, createSourceRef, section } from '../defaults';
import CollisionFilterExtension from '../../utils/deckgl/CollisionFilterExtension';
import {
  createCommonLayerProps,
  createLineSelectionAccessors,
  createSelectionState,
  getFeaturePosition,
} from '../utils';
import { autoDecimalsText } from 'layers/text';
import { AccessorContext } from '@deck.gl/core';
export interface ScatterplotLayerSettings {
  radiusMinPixels: number;
  radiusMaxPixels: number;
  radius: SourceRef;
  radiusScale: number;
  elevation: SourceRef;
  elevationScale: number;
  depthTest: boolean;
  stroked: boolean;
  showLabels: boolean;
  label: SourceRef;
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
  showLabels: false,
  label: createSourceRef(),
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
      { key: 'radius', label: 'Radius field', type: 'fieldPicker', defaultValue: createSourceRef() },
      { key: 'radiusScale', label: 'Radius scale', type: 'number', defaultValue: 1 },
      { key: 'elevation', label: 'Elevation field', type: 'fieldPicker', defaultValue: createSourceRef() },
      { key: 'elevationScale', label: 'Elevation scale', type: 'number', defaultValue: 1 },
      { key: 'depthTest', label: 'Depth test', type: 'boolean', defaultValue: false },
      { key: 'stroked', label: 'Stroke outline', type: 'boolean', defaultValue: true },
    ]),
    section('Text', [
      { key: 'showLabels', label: 'Show labels', type: 'boolean', defaultValue: false },
      { key: 'label', label: 'Label field', type: 'fieldPicker', defaultValue: createSourceRef() },
    ]),
  ],
  renderLayers(context: LayerRenderContext<ScatterplotLayerConfig>) {
    const { config, features, selectedKey, getAccessor, getNumericAccessor } = context;
    const options = config.settings;
    const valueField = config.colorScale?.field || config.shader?.value;

    const hasScheme = !!(config.colorScale?.schemeName || config.colorScale?.type === 'threshold');
    const useShader = !!(hasScheme && valueField?.field);

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
    const [getColorValue, updateColorValue] = config.colorScale?.field ? getNumericAccessor(config.colorScale.field) : [undefined, []];
    const getColor = buildColorAccessor(config.colorScale, [0, 155, 104, 255], getColorValue);
    const selectionState = createSelectionState(selectedKey, config.selectionKey, config.data.featureSource.id);
    const lineAccessors = createLineSelectionAccessors(selectionState.isSelected);

    const [getRadius, updateRadius] = getNumericAccessor(options.radius, options.radiusScale);
    const [getValue, updateValue] = useShader ? getNumericAccessor(valueField) : [undefined, []];

    const layers: any[] = [
      new ScatterplotLayer({
        ...commonProps,
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
          getLineColor: [selectedKey, config.selectionKey?.source, config.selectionKey?.field, config.data.featureSource.id],
          getLineWidth: [selectedKey, config.selectionKey?.source, config.selectionKey?.field, config.data.featureSource.id],
          getRadius: [...updateRadius],
          getFillColor: updateColorValue,
          ...(useShader ? { getValue: [...updateValue, selectedKey, config.colorScale] } : {}),
        },
        parameters: { blend: true, depthTest: false },
      }),
    ];

    if (options.showLabels) {
      const [getText, updateText] = getAccessor(options.label?.field ? options.label : valueField, '');
      const [getCollisionPriority, updateCollisionPriority] = getNumericAccessor(options.elevation, options.elevationScale);
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
          getFilterValue: commonProps.getFilterValue,
          filterRange: commonProps.filterRange,
          collisionGroup: 'scatter-labels',
          collisionTestProps: { sizeScale: 2 },
          getCollisionPriority: getCollisionPriority ?? 0,
          extensions: [new DataFilterExtension({ filterSize: 1 }), new CollisionFilterExtension()],
          updateTriggers: { 
            ...commonProps.updateTriggers,
            getText: updateText,
            getCollisionPriority: updateCollisionPriority,
          },
          parameters: { depthTest: false },
          polygonOffset: 1,
        }),
      );
    }

    return layers;
  },
};

export default scatterplotLayerDefinition;
