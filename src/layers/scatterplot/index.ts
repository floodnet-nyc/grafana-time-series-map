import { ScatterplotLayer, TextLayer } from '@deck.gl/layers';
import { DataFilterExtension } from '@deck.gl/extensions';
import type { Feature } from 'geojson';
import { CreateMathExtensionSubclass } from '../../utils/deckgl/MathExtension';
import { buildColorAccessor, buildInterpolateColorGlsl, DEFAULT_VS_FILTER_COLOR } from '../../utils/deckgl/colorScales';
import { registerLayer } from '../registry';
import type { LayerRenderContext, LayerRenderer, LayerOptionField } from '../types';

const schema: LayerOptionField[] = [
  { key: 'radiusMinPixels', label: 'Min radius (px)', type: 'number', defaultValue: 4, section: 'Point' },
  { key: 'radiusMaxPixels', label: 'Max radius (px)', type: 'number', defaultValue: 20, section: 'Point' },
  { key: 'radiusField', label: 'Radius field', type: 'fieldPicker', defaultValue: '', section: 'Point' },
  { key: 'radiusScale', label: 'Radius scale', type: 'number', defaultValue: 1, section: 'Point' },
  { key: 'stroked', label: 'Stroke outline', type: 'boolean', defaultValue: true, section: 'Point' },
  { key: 'showLabels', label: 'Show labels', type: 'boolean', defaultValue: false, section: 'Text' },
  { key: 'labelField', label: 'Label field', type: 'fieldPicker', defaultValue: '', section: 'Text' },
];

const ScatterColorExtension = CreateMathExtensionSubclass({
  name: 'ScatterColor',
  attrs: { value: { type: 'float' } },
  uniforms: {},
  inject: {},
});

const renderer: LayerRenderer = {
  type: 'scatterplot',
  label: 'Scatter Plot',
  defaultOptions: {
    radiusMinPixels: 4,
    radiusMaxPixels: 20,
    radiusField: '',
    radiusScale: 1,
    stroked: true,
    showLabels: false,
    labelField: '',
  },
  optionsSchema: schema,

  renderLayers({ config, features, timeFilterFlags, selectedKey, onFeatureClick }: LayerRenderContext) {
    const opts = config.options as Record<string, any>;

    // Value field: prefer colorScale.field, then shader.valueField, then legacy fieldMapping
    const valueField =
      config.colorScale?.field ||
      config.shader?.valueField ||
      config.fieldMappings?.find((m) => m.alias === 'value')?.alias ||
      '';

    // Always use shader when a color scheme is configured
    const hasScheme = !!(config.colorScale?.schemeName || config.colorScale?.type === 'threshold');
    const useShader = !!(hasScheme && valueField);

    const extensions: any[] = [
      new DataFilterExtension({ filterSize: 1 }),
    ];
    if (useShader) {
      const autoDecl = buildInterpolateColorGlsl(config.colorScale!);
      const userDecl = config.shader?.vsDecl?.trim() ?? '';
      const vsFilterColor = config.shader?.vsFilterColor?.trim() || DEFAULT_VS_FILTER_COLOR;
      extensions.push(
        new ScatterColorExtension({
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

    const keyField = config.timeFilter?.groupByField ?? '';
    const isSelected = (f: Feature) =>
      selectedKey != null && keyField && String(f.properties?.[keyField]) === selectedKey;
    const hasSelection = selectedKey != null && keyField;

    const layers: any[] = [];

    layers.push(
      new ScatterplotLayer({
        id: `scatterplot/${config.id}`,
        data: features,
        visible: config.visible,
        opacity: config.opacity,
        radiusMinPixels: opts.radiusMinPixels ?? 4,
        radiusMaxPixels: opts.radiusMaxPixels ?? 20,
        radiusUnits: 'pixels' as const,
        stroked: opts.stroked ?? true,
        filled: true,
        getLineColor: hasSelection
          ? (f: Feature) => (isSelected(f) ? [255, 230, 60, 255] : [200, 200, 240, 60])
          : [200, 200, 240, 200],
        getLineWidth: hasSelection ? (f: Feature) => (isSelected(f) ? 3 : 1) : 2,
        lineWidthMinPixels: 0,
        pickable: config.pickable ?? true,
        minZoom: config.minZoom,
        maxZoom: config.maxZoom,
        getPosition: (f: Feature) => {
          const coords = (f.geometry as any)?.coordinates;
          if (!coords) {return [0, 0, 0];}
          let z = 0;
          if (config.elevation?.field) {
            z = Number(f.properties?.[config.elevation.field] ?? 0) * (config.elevation.scale ?? 1);
          }
          return [coords[0], coords[1], z];
        },
        getFillColor: useShader ? [0, 0, 0, 255] : getColor,
        getRadius: opts.radiusField
          ? (f: Feature) => {
              const v = Number(f.properties?.[opts.radiusField] ?? 0);
              return Math.max(opts.radiusMinPixels ?? 4, v * (opts.radiusScale ?? 1));
            }
          : opts.radiusMinPixels ?? 4,
        onClick: onFeatureClick
          ? (info: any) => info.object && onFeatureClick(info.object, info)
          : undefined,
        getFilterValue: (f: any) => (timeFilterFlags[f.__idx] ? 1 : -1),
        filterRange: [1, 1] as [number, number],
        ...(useShader ? { getValue: (f: Feature) => Number(f.properties?.[valueField] ?? 0) } : {}),
        extensions,
        updateTriggers: {
          getFilterValue: [timeFilterFlags],
          getLineColor: [selectedKey],
          getLineWidth: [selectedKey],
        },
        parameters: { blend: true, depthTest: false },
      }),
    );
    if (opts.showLabels) {
      const labelField = opts.labelField || valueField;
      const getDecimals = (v: number) => (v > 6 ? 0 : 0);
      layers.push(
        new TextLayer({
          id: `scatterplot-labels/${config.id}`,
          data: features,
          visible: config.visible,
          pickable: false,
          getPosition: (f: Feature) => {
            const coords = (f.geometry as any)?.coordinates;
            if (!coords) {return [0, 0, 0];}
            let z = 0;
            if (config.elevation?.field) {
              z = Number(f.properties?.[config.elevation.field] ?? 0) * (config.elevation.scale ?? 1);
            }
            return [coords[0], coords[1], z];
          },
          getText: (f: Feature) => {
            const v = f.properties?.[labelField];
            if (v === undefined || v === null) { return ''; }
            if (typeof v === 'number') {
              return v.toFixed(getDecimals(v));
            }
            return String(v);
          },
          getSize: (f: Feature) => {
            const v = Number(f.properties?.[opts.radiusField] ?? 0);
            const decs = getDecimals(v);
            const chars = String(v.toFixed(decs)).length;
            return (
              (opts.radiusMinPixels ?? 4) +
              Math.max(0, Math.min(
                opts.radiusMaxPixels ?? 20, 
                v * (opts.radiusScale ?? 1)
              )) / chars
            )
            // return Math.max(Math.max((opts.radiusMinPixels ?? 4)*1.5, 10), Math.min(opts.radiusMaxPixels, v * (opts.radiusScale ?? 1)) * 1.2);
          },
          getColor: [255, 255, 255, 220],
          // outlineColor: [0, 0, 0, 200],
          // outlineWidth: 1,
          // getBackgroundColor: [0, 0, 0, 120],
          // background: true,
          // backgroundPadding: [2, 1, 2, 1],
          // getPixelOffset: [0, -(opts.radiusMaxPixels ?? 20) - 4],
          getAlignmentBaseline: 'center',
          getAnchor: 'middle',
          billboard: true,
          fontWeight: 900,
          fontFamily: "Helvetica Neue, Verdana, Roboto, Helvetica, sans-serif",
          // fontSettings: {
          //   sdf: true,
          // },
          minZoom: config.minZoom,
          maxZoom: config.maxZoom,
          getFilterValue: (f: any) => (timeFilterFlags[f.__idx] ? 1 : -1),
          filterRange: [1, 1] as [number, number],
          extensions: [new DataFilterExtension({ filterSize: 1 })],
          updateTriggers: { getFilterValue: [timeFilterFlags] },
          parameters: { depthTest: false },
          polygonOffset: 1,
        }),
      );
    }

    return layers;
  },
};

registerLayer(renderer);
export default renderer;
