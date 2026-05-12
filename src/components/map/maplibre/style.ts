const STYLE_URLS: Record<string, string> = {
  'carto-dark': 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
  'carto-light': 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
  osm: 'https://demotiles.maplibre.org/style.json',
};

export function getMaplibreStyleUrl(maplibreStyle: string, customStyleUrl?: string) {
  return maplibreStyle === 'custom'
    ? customStyleUrl ?? STYLE_URLS['carto-dark']
    : STYLE_URLS[maplibreStyle] ?? STYLE_URLS['carto-dark'];
}
