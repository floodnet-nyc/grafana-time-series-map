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
export type LayerDefinitionForType<TType extends LayerType> = Extract<(typeof layerDefinitions)[number], { type: TType }>;
export type LayerConfigForType<TType extends LayerType> = ReturnType<LayerDefinitionForType<TType>['createDefaultConfig']>;
export type LayerConfig = LayerConfigForType<LayerType>;

const layerDefinitionsByType = Object.fromEntries(
  layerDefinitions.map((definition) => [definition.type, definition])
) as Record<LayerType, (typeof layerDefinitions)[number]>;

export function getLayerDefinition<TType extends string>(type: TType): Extract<(typeof layerDefinitions)[number], { type: TType }> | undefined {
  return (layerDefinitionsByType as Partial<Record<string, (typeof layerDefinitions)[number]>>)[type] as
    | Extract<(typeof layerDefinitions)[number], { type: TType }>
    | undefined;
}

export function createLayerConfig<TType extends LayerType>(type: TType, index: number): LayerConfigForType<TType> | undefined {
  const definition = getLayerDefinition(type);
  return definition?.createDefaultConfig(index) as LayerConfigForType<TType> | undefined;
}
