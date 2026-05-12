import { getMaplibreStyleUrl } from './style';

describe('getMaplibreStyleUrl', () => {
  it('returns known preset URLs', () => {
    expect(getMaplibreStyleUrl('carto-voyager')).toBe('https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json');
    expect(getMaplibreStyleUrl('versatiles-colorful')).toBe(
      'https://tiles.versatiles.org/assets/styles/colorful/style.json'
    );
    expect(getMaplibreStyleUrl('versatiles-shadow')).toBe('https://tiles.versatiles.org/assets/styles/shadow/style.json');
  });

  it('uses custom URLs when provided', () => {
    expect(getMaplibreStyleUrl('custom', 'https://example.com/style.json')).toBe('https://example.com/style.json');
  });

  it('falls back to the default preset for custom styles without a URL', () => {
    expect(getMaplibreStyleUrl('custom')).toBe('https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json');
  });
});
