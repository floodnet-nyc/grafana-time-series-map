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
];

export type LayerType = (typeof layerDefinitions)[number]['type'];
export type LayerConfig = ReturnType<(typeof layerDefinitions)[number]['createDefaultConfig']>;
