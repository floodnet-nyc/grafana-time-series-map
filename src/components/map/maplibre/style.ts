import type { MaplibreStyle } from '../../../types';

const DEFAULT_STYLE: Exclude<MaplibreStyle, 'custom'> = 'carto-dark';

const STYLE_URLS: Record<Exclude<MaplibreStyle, 'custom'>, string> = {
  'carto-dark': 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
  'carto-light': 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
  'carto-voyager': 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json',
  osm: 'https://demotiles.maplibre.org/style.json',
  'versatiles-colorful': 'https://tiles.versatiles.org/assets/styles/colorful/style.json',
  'versatiles-graybeard': 'https://tiles.versatiles.org/assets/styles/graybeard/style.json',
  'versatiles-eclipse': 'https://tiles.versatiles.org/assets/styles/eclipse/style.json',
  'versatiles-neutrino': 'https://tiles.versatiles.org/assets/styles/neutrino/style.json',
  'versatiles-shadow': 'https://tiles.versatiles.org/assets/styles/shadow/style.json',
};

export function getMaplibreStyleUrl(maplibreStyle: MaplibreStyle, customStyleUrl?: string) {
  return maplibreStyle === 'custom' ? customStyleUrl ?? STYLE_URLS[DEFAULT_STYLE] : STYLE_URLS[maplibreStyle];
}
