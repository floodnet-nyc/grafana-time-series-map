import { ScatterplotLayer, TextLayer } from '@deck.gl/layers';
import { DataFilterExtension } from '@deck.gl/extensions';
import type { Feature } from 'geojson';
import type { ScatterplotLayerConfig, ScatterplotLayerSettings } from '../../types';
import { CreateMathExtensionSubclass } from '../../utils/deckgl/MathExtension';
import { buildColorAccessor, buildInterpolateColorGlsl, DEFAULT_VS_FILTER_COLOR } from '../../utils/deckgl/colorScales';
import { createBaseLayerConfig, section } from '../defaults';
import type { LayerDefinition, LayerRenderContext } from '../types';
import CollisionFilterExtension from '../../utils/deckgl/collisionFilterFix';
import {
  createCommonLayerProps,
  createLineSelectionAccessors,
  createSelectionState,
  getFeaturePosition,
} from '../utils';

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
    const { config, features, timeFilterFlags, selectedKey } = context;
    const options = config.settings;

    const valueField =
      config.colorScale?.field ||
      config.shader?.valueField ||
      config.fieldMappings?.find((m) => m.alias === 'value')?.alias ||
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

    const getColor = buildColorAccessor(config.colorScale);
    const selectionState = createSelectionState(selectedKey, config.timeFilter?.groupByField);
    const commonProps = createCommonLayerProps(context);
    const lineAccessors = createLineSelectionAccessors(selectionState);

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
        getLineColor: lineAccessors.getLineColor,
        getLineWidth: lineAccessors.getLineWidth,
        lineWidthMinPixels: 0,
        getPosition: (f: Feature) => getFeaturePosition(f, config),
        getFillColor: useShader ? [0, 0, 0, 255] : getColor,
        getRadius: options.radiusField
          ? (f: Feature) => {
              const v = Number(f.properties?.[options.radiusField] ?? 0);
              return Math.max(options.radiusMinPixels, v * options.radiusScale);
            }
          : options.radiusMinPixels,
        ...(useShader ? { getValue: (f: Feature) => Number(f.properties?.[valueField] ?? 0) } : {}),
        extensions: [...commonProps.extensions, ...(shaderExtensions as any[])],
        updateTriggers: {
          ...commonProps.updateTriggers,
          getLineColor: [selectedKey],
          getLineWidth: [selectedKey],
        },
        parameters: { blend: true, depthTest: false },
      }),
    ];

    if (options.showLabels) {
      const labelField = options.labelField || valueField;
      const getDecimals = (v: number) => (v > 6 ? 0 : 1);
      layers.push(
        new TextLayer({
          id: `scatterplot-labels/${config.id}`,
          data: features,
          visible: config.visible,
          pickable: false,
          getPosition: (f: Feature) => getFeaturePosition(f, config),
          getText: (f: Feature) => {
            const v = f.properties?.[labelField];
            if (v === undefined || v === null) {
              return '';
            }
            if (typeof v === 'number') {
              return v.toFixed(getDecimals(v));
            }
            return String(v);
          },
          getSize: (f: Feature) => {
            const v = Number(f.properties?.[options.radiusField] ?? 0);
            const decs = getDecimals(v);
            const chars = String(v.toFixed(decs)).length;
            return options.radiusMinPixels + Math.max(0, Math.min(options.radiusMaxPixels, v * options.radiusScale)) / chars;
          },
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
          getCollisionPriority: (f: any) => Number(f.properties?.[config.elevation?.field ?? ''] ?? 0) - 1000,
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
