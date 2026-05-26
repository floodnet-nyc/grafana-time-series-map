import { arcLayerDefinition } from './arc';
import { cogLayerDefinition } from './cog';
import { floodInundationLayerDefinition } from './floodinundation';
import { geoJsonLayerDefinition } from './geojson';
import { heatmapLayerDefinition } from './heatmap';
import { hexagonLayerDefinition } from './hexagon';
import { iconLayerDefinition } from './icon';
import { lineLayerDefinition } from './line';
import { pathLayerDefinition } from './path';
import { polygonLayerDefinition } from './polygon';
import { scatterplotLayerDefinition } from './scatterplot';
import { textLayerDefinition } from './text';
import { tripsLayerDefinition } from './trips';

export const layerDefinitions = [
  scatterplotLayerDefinition,
  geoJsonLayerDefinition,
  polygonLayerDefinition,
  pathLayerDefinition,
  tripsLayerDefinition,
  heatmapLayerDefinition,
  hexagonLayerDefinition,
  arcLayerDefinition,
  cogLayerDefinition,
  floodInundationLayerDefinition,
  iconLayerDefinition,
  textLayerDefinition,
  lineLayerDefinition,
] as const;

export type LayerType = (typeof layerDefinitions)[number]['type'];
export type AnyLayerDefinition = (typeof layerDefinitions)[number];
export type LayerDefinitionForType<TType extends LayerType> = Extract<
  AnyLayerDefinition,
  { type: TType }
>;
export type LayerConfigForType<TType extends LayerType> = ReturnType<
  LayerDefinitionForType<TType>['createDefaultConfig']
>;
export type LayerConfig = LayerConfigForType<LayerType>;

const layerDefinitionsByType = Object.fromEntries(
  layerDefinitions.map((definition) => [definition.type, definition])
) as Record<LayerType, AnyLayerDefinition>;

export function getLayerDefinition<TType extends string>(
  type: TType
): Extract<AnyLayerDefinition, { type: TType }> | undefined {
  return (layerDefinitionsByType as Partial<Record<string, AnyLayerDefinition>>)[type] as
    | Extract<AnyLayerDefinition, { type: TType }>
    | undefined;
}

export function createLayerConfig<TType extends LayerType>(
  type: TType,
  index: number
): LayerConfigForType<TType> | undefined {
  const definition = getLayerDefinition(type);
  return definition?.createDefaultConfig(index) as LayerConfigForType<TType> | undefined;
}

const asyncLayerDefinitionCache = new Map<string, AnyLayerDefinition>();

export function hasAsyncLayerDefinition(type: string): boolean {
  return type === 'cog';
}

export async function loadLayerDefinition(type: string): Promise<AnyLayerDefinition | undefined> {
  if (!hasAsyncLayerDefinition(type)) {
    return getLayerDefinition(type);
  }

  const cachedDefinition = asyncLayerDefinitionCache.get(type);
  if (cachedDefinition) {
    return cachedDefinition;
  }

  if (type === 'cog') {
    const [{ renderCogLayers }, definition] = await Promise.all([import('./cog/runtime'), import('./cog')]);
    const loadedDefinition: typeof cogLayerDefinition = {
      ...definition.cogLayerDefinition,
      renderLayers: renderCogLayers,
    };
    asyncLayerDefinitionCache.set(type, loadedDefinition);
    return loadedDefinition;
  }

  return undefined;
}
