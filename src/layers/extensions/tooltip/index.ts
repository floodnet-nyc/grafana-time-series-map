import type { Layer, PickingInfo } from '@deck.gl/core';
import type { PreparedLayerState } from '../../../utils/dataframe/panelLayersModel';
import type { DeckTooltipContent } from '../../../components/map/types';
import { buildFeatureScope, getFeatureFromDatum, getFeatureIndex } from '../../../utils/featureScope';
import type { LayerTooltipConfig, LayerExtensionDefinition } from '../types';

const DEFAULT_TOOLTIP_TEMPLATE = [
  '<div class="">',
  '  <div class="tooltip-title">{{layer.label}}</div>',
  '  <div><strong>ID:</strong> {{this.deployment_id}}</div>',
  '</div>',
].join('\n');

const TOOLTIP_STYLE = {
  // backgroundColor: 'rgba(18, 24, 38, 0.94)',
  // border: '1px solid rgba(255, 255, 255, 0.14)',
  // borderRadius: '8px',
  // boxShadow: '0 10px 32px rgba(0, 0, 0, 0.28)',
  // color: '#f3f4f7',
  // fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, Liberation Mono, monospace',
  // fontSize: '12px',
  // lineHeight: '1.5',
  // maxWidth: '320px',
  // padding: '10px 12px',
  // pointerEvents: 'none',
  // whiteSpace: 'normal',
  // zIndex: '30',
} as const;

type LayerWithTooltipProps = Layer & {
  props?: {
    id?: string;
    tooltipTemplate?: string;
  };
};

export function createDefaultTooltipConfig(): LayerTooltipConfig {
  return {
    enabled: false,
    template: DEFAULT_TOOLTIP_TEMPLATE,
  };
}

export const tooltipExtensionDefinition: LayerExtensionDefinition = {
  id: 'tooltip',
  createDefaults: createDefaultTooltipConfig,
  editorSections: [
    {
      title: 'Tooltip',
      fields: [
        { key: 'enabled', label: 'Enable hover tooltip', type: 'boolean', defaultValue: false },
        { key: 'template', label: 'HTML template', type: 'code', defaultValue: DEFAULT_TOOLTIP_TEMPLATE, language: 'html', editorHeight: 320 },
      ],
    },
  ],
  apply(layer, config) {
    const options = config.extensions?.tooltip;
    if (!options?.enabled) {
      return layer;
    }

    return layer.clone({
      tooltipTemplate: options.template,
    } as any);
  },
};

export function buildDeckTooltip(preparedLayerStates: PreparedLayerState[]): (info: PickingInfo) => DeckTooltipContent {
  const stateByLayerId = new Map(preparedLayerStates.map((state) => [state.config.id, state]));

  return (info: PickingInfo) => {
    const layerProps = ((info.layer as LayerWithTooltipProps | null)?.props ?? {}) as LayerWithTooltipProps['props'];
    const layerId = resolvePreparedLayerId(layerProps?.id);
    const template = layerProps?.tooltipTemplate;
    if (!layerId || !template || !info.object) {
      return null;
    }

    const preparedLayerState = stateByLayerId.get(layerId);
    if (!preparedLayerState) {
      return null;
    }

    const feature = getFeatureFromDatum(info.object);
    if (!feature) {
      return null;
    }

    const featureIndex = getFeatureIndex(feature);
    const derived =
      featureIndex !== undefined && preparedLayerState.derivedValues ? preparedLayerState.derivedValues[featureIndex] : undefined;
    const scope = buildFeatureScope(
      preparedLayerState.config,
      feature,
      preparedLayerState.secondarySourceValues,
      derived,
    );
    const html = renderTooltipTemplate(template, scope).trim();

    return html ? { html, style: TOOLTIP_STYLE } : null;
  };
}

function resolvePreparedLayerId(layerId: string | undefined): string | undefined {
  if (!layerId) {
    return undefined;
  }

  const lastSlash = layerId.lastIndexOf('/');
  return lastSlash >= 0 ? layerId.slice(lastSlash + 1) : layerId;
}

function renderTooltipTemplate(template: string, scope: Record<string, unknown>): string {
  return template.replace(/{{\s*([a-zA-Z0-9_.]+)\s*}}/g, (_match, path) => escapeHtml(readPath(scope, path)));
}

function readPath(scope: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce<unknown>((current, segment) => {
    if (current == null || typeof current !== 'object') {
      return undefined;
    }

    return (current as Record<string, unknown>)[segment];
  }, scope);
}

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
