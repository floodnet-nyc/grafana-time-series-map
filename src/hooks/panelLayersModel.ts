import type { DataFrame } from '@grafana/data';
import type { Layer } from '@deck.gl/core';
import type { Feature } from 'geojson';
import { layerExtensionDefinitions } from '../layers/extensions';
import type { LayerExtensionDefinition } from 'layers/extensions';
import { layerDefinitions } from '../layers/_all';
import type { LayerDefinition, LayerRenderContext } from '../layers/types';
import type { LayerSecondarySourceConfig, MapPanelOptions } from '../types';
import type { LayerConfig } from '../layers/types';
import { compileExpression } from '../utils/expressionEngine';
import { dataFramesToFeatures } from '../utils/dataframe/toGeoJsonFeatures';
import { buildPacked, computeClosestFlags, resolveAsofLookup } from '../utils/deckgl/closestTimeFiltering';
import type { PanelFeaturesByLayerId } from './usePanelFeatures';

type PackedLookupEntry = {
  features: Feature[];
  packed: ReturnType<typeof buildPacked>;
};

export interface PreparedLayerState {
  config: LayerConfig;
  features: Feature[];
  timeFilterFlags: Uint8Array;
  secondarySourceValues?: Map<string, Map<string, Record<string, number>>>;
  derivedValues?: Array<Record<string, unknown>>;
}

function getLayerSecondarySources(layerConfig: LayerConfig): LayerSecondarySourceConfig[] {
  return layerConfig.secondarySources ?? [];
}

export function buildTimePackedByLayerId(layerConfigs: LayerConfig[], featuresByLayerId: PanelFeaturesByLayerId) {
  const packedByLayerId = new Map<string, ReturnType<typeof buildPacked>>();

  for (const layerConfig of layerConfigs) {
    if (layerConfig.timeFilter.mode !== 'asof') {
      continue;
    }

    const features = featuresByLayerId.get(layerConfig.id) ?? [];
    const { timeField, groupByField = 'id' } = layerConfig.timeFilter;
    packedByLayerId.set(layerConfig.id, buildPacked(features, groupByField, timeField));
  }

  return packedByLayerId;
}

export function buildSecondarySourcePackedByLayerId(layerConfigs: LayerConfig[], series: DataFrame[]) {
  const packedByLayerId = new Map<string, Map<string, PackedLookupEntry>>();

  for (const layerConfig of layerConfigs) {
    const secondarySources = getLayerSecondarySources(layerConfig);
    if (secondarySources.length === 0) {
      continue;
    }

    const packedBySourceId = new Map<string, PackedLookupEntry>();

    for (const secondarySource of secondarySources) {
      if (secondarySource.join.type !== 'keyed-asof') {
        continue;
      }

      const features = dataFramesToFeatures(series, secondarySource.queryRefId, { type: 'none' }, undefined, []);
      packedBySourceId.set(secondarySource.queryRefId, {
        features,
        packed: buildPacked(features, secondarySource.join.remoteKeyField, secondarySource.join.timeField),
      });
    }

    if (packedBySourceId.size > 0) {
      packedByLayerId.set(layerConfig.id, packedBySourceId);
    }
  }

  return packedByLayerId;
}

export function buildSecondarySourceValuesByLayerId(
  layerConfigs: LayerConfig[],
  packedByLayerId: Map<string, Map<string, PackedLookupEntry>>,
  cursorTimeMs: number,
) {
  const valuesByLayerId = new Map<string, Map<string, Map<string, Record<string, number>>>>();

  for (const layerConfig of layerConfigs) {
    const secondarySources = getLayerSecondarySources(layerConfig);
    if (secondarySources.length === 0) {
      continue;
    }

    const packedBySourceId = packedByLayerId.get(layerConfig.id);
    if (!packedBySourceId) {
      continue;
    }

    const valuesBySourceId = new Map<string, Map<string, Record<string, number>>>();

    for (const secondarySource of secondarySources) {
      const entry = packedBySourceId.get(secondarySource.queryRefId);
      if (!entry || secondarySource.join.type !== 'keyed-asof') {
        continue;
      }

      valuesBySourceId.set(
        secondarySource.queryRefId,
        resolveAsofLookup(
          entry.features,
          entry.packed,
          secondarySource.fields,
          cursorTimeMs,
          secondarySource.join.maxLagMs,
        ),
      );
    }

    if (valuesBySourceId.size > 0) {
      valuesByLayerId.set(layerConfig.id, valuesBySourceId);
    }
  }

  return valuesByLayerId;
}

export function buildTimeFilterFlagsByLayerId(
  layerConfigs: LayerConfig[],
  featuresByLayerId: PanelFeaturesByLayerId,
  packedByLayerId: Map<string, ReturnType<typeof buildPacked>>,
  cursorTimeMs: number,
  fromTimeMs: number,
  toTimeMs: number,
) {
  const flagsByLayerId = new Map<string, Uint8Array>();

  for (const layerConfig of layerConfigs) {
    const features = featuresByLayerId.get(layerConfig.id) ?? [];
    const { mode, timeField, maxLagMs } = layerConfig.timeFilter;

    if (mode === 'none' || !timeField) {
      flagsByLayerId.set(layerConfig.id, new Uint8Array(features.length).fill(1));
      continue;
    }

    if (mode === 'window') {
      const tolerance = layerConfig.timeFilter.windowToleranceMs ?? 0;
      const flags = new Uint8Array(features.length);

      features.forEach((feature, index) => {
        const raw = feature.properties?.[timeField];
        const timeMs = raw instanceof Date ? raw.getTime() : Number(raw);
        flags[index] = timeMs >= fromTimeMs - tolerance && timeMs <= toTimeMs + tolerance ? 1 : 0;
      });

      flagsByLayerId.set(layerConfig.id, flags);
      continue;
    }

    if (mode === 'asof') {
      const packed = packedByLayerId.get(layerConfig.id);
      flagsByLayerId.set(
        layerConfig.id,
        packed ? computeClosestFlags(packed.buckets, cursorTimeMs, maxLagMs) : new Uint8Array(features.length),
      );
      continue;
    }

    flagsByLayerId.set(layerConfig.id, new Uint8Array(features.length));
  }

  return flagsByLayerId;
}

export function buildPreparedLayerStates(
  layerConfigs: LayerConfig[],
  featuresByLayerId: PanelFeaturesByLayerId,
  flagsByLayerId: Map<string, Uint8Array>,
  secondarySourceValuesByLayerId: Map<string, Map<string, Map<string, Record<string, number>>>> = new Map(),
): PreparedLayerState[] {
  return layerConfigs.map((config) => ({
    config,
    features: featuresByLayerId.get(config.id) ?? [],
    timeFilterFlags: flagsByLayerId.get(config.id) ?? new Uint8Array(),
    secondarySourceValues: secondarySourceValuesByLayerId.get(config.id),
    derivedValues: buildDerivedValues(
      config,
      featuresByLayerId.get(config.id) ?? [],
      secondarySourceValuesByLayerId.get(config.id),
    ),
  }));
}

interface RenderPreparedLayersArgs {
  preparedLayerStates: PreparedLayerState[];
  options: MapPanelOptions;
  cursorTimeMs: number;
  fromTimeMs: number;
  toTimeMs: number;
  selectedKey: string | null;
  onFeatureClick?: (feature: Feature, info: any) => void;
  getRenderer?: (type: string) => LayerDefinition<any> | undefined;
  applyExtensions?: (layers: Layer[], config: LayerConfig) => Layer[];
}

export function renderPreparedLayers({
  preparedLayerStates,
  options,
  cursorTimeMs,
  fromTimeMs,
  toTimeMs,
  selectedKey,
  onFeatureClick,
  getRenderer = getLayerDefinition,
  applyExtensions = applyConfiguredLayerExtensions,
}: RenderPreparedLayersArgs): Layer[] {
  const renderedLayers: Layer[] = [];

  for (const preparedLayerState of preparedLayerStates) {
    if (!preparedLayerState.config.visible) {
      continue;
    }

    const renderer = getRenderer(preparedLayerState.config.type);
    if (!renderer) {
      continue;
    }

    const renderContext: LayerRenderContext = {
      config: preparedLayerState.config,
      panelOptions: options,
      features: preparedLayerState.features,
      cursorTimeMs,
      fromTimeMs,
      toTimeMs,
      timeFilterFlags: preparedLayerState.timeFilterFlags,
      secondarySourceValues: preparedLayerState.secondarySourceValues,
      derivedValues: preparedLayerState.derivedValues,
      selectedKey,
      onFeatureClick,
    };

    const layers = applyExtensions(renderer.renderLayers(renderContext), preparedLayerState.config);
    renderedLayers.push(...layers);
  }

  return renderedLayers;
}

function getLayerDefinition(type: string) {
  return layerDefinitions.find((definition) => definition.type === type);
}

function applyConfiguredLayerExtensions(layers: Layer[], config: LayerConfig) {
  return applyLayerExtensions(layers, config, layerExtensionDefinitions);
}

function applyLayerExtensions(layers: Layer[], config: LayerConfig, definitions: LayerExtensionDefinition[]): Layer[] {
  return layers.map((layer) => definitions.reduce((current, extension) => extension.apply(current, config), layer));
}

function buildDerivedValues(
  config: LayerConfig,
  features: Feature[],
  secondarySourceValues?: Map<string, Map<string, Record<string, number>>>,
): Array<Record<string, unknown>> | undefined {
  if (!config.derivedFields?.length) {
    return undefined;
  }

  const compiledDerivedFields = config.derivedFields.map((derivedField) => ({
    as: derivedField.as,
    evaluate: compileExpression(derivedField.expression),
  }));

  return features.map((feature) => {
    const scope = buildFeatureScope(config, feature, secondarySourceValues);
    const derived: Record<string, unknown> = {};

    for (const derivedField of compiledDerivedFields) {
      derived[derivedField.as] = derivedField.evaluate({
        ...scope,
        derived,
      });
    }

    return derived;
  });
}

function buildFeatureScope(
  config: LayerConfig,
  feature: Feature,
  secondarySourceValues?: Map<string, Map<string, Record<string, number>>>,
) {
  const primary = { ...(feature.properties ?? {}) };
  const sources: Record<string, Record<string, unknown>> = {};

  for (const secondarySource of getLayerSecondarySources(config)) {
    const localKey = String(feature.properties?.[secondarySource.join.localKeyField] ?? '');
    const values = secondarySourceValues?.get(secondarySource.queryRefId)?.get(localKey) ?? {};
    sources[secondarySource.queryRefId] = values;
  }

  return {
    this: primary,
    ...sources,
  };
}
