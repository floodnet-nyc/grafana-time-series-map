import { formatMapHashView, parseMapHashViewFromHash, upsertMapHashView } from './mapHashRouteModel';

describe('mapHashRouteModel', () => {
  it('parses a hash view from the URL fragment', () => {
    expect(parseMapHashViewFromHash('#v=11.25/40.7128/-74.006/12.3/45.6')).toEqual({
      zoom: 11.25,
      latitude: 40.7128,
      longitude: -74.006,
      bearing: 12.3,
      pitch: 45.6,
    });
  });

  it('returns null for invalid or missing view hashes', () => {
    expect(parseMapHashViewFromHash('#foo=bar')).toBeNull();
    expect(parseMapHashViewFromHash('#v=bad/data')).toBeNull();
  });

  it('formats a hash view with the expected precision', () => {
    expect(
      formatMapHashView({
        zoom: 11.256,
        latitude: 40.7128123,
        longitude: -74.0060123,
        bearing: 12.34,
        pitch: 45.67,
      })
    ).toBe('11.26/40.712812/-74.006012/12.3/45.7');
  });

  it('upserts the map hash view while preserving other hash parts', () => {
    expect(
      upsertMapHashView('#foo=bar&v=1/2/3/4/5', {
        zoom: 8,
        latitude: 9,
        longitude: 10,
        bearing: 11,
        pitch: 12,
      })
    ).toBe('#foo=bar&v=8/9/10/11/12');

    expect(
      upsertMapHashView('#foo=bar', {
        zoom: 1,
        latitude: 2,
        longitude: 3,
        bearing: 4,
        pitch: 5,
      })
    ).toBe('#foo=bar&v=1/2/3/4/5');
  });
});
