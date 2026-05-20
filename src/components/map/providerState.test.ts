import { applyWidgetViewStateChange } from './useMapProviderState';

describe('providerState', () => {
  it('applies delta-based zoom changes without losing the existing viewport', () => {
    expect(
      applyWidgetViewStateChange(
        { latitude: 40, longitude: -74, zoom: 10, bearing: 5, pitch: 15 },
        { delta: 2, bearing: 20 }
      )
    ).toEqual({
      latitude: 40,
      longitude: -74,
      zoom: 12,
      bearing: 20,
      pitch: 15,
    });
  });

  it('merges coordinate changes selectively', () => {
    expect(
      applyWidgetViewStateChange(
        { latitude: 40, longitude: -74, zoom: 10, bearing: 5, pitch: 15 },
        { latitude: 41, longitude: -73, pitch: 25 }
      )
    ).toEqual({
      latitude: 41,
      longitude: -73,
      zoom: 10,
      bearing: 5,
      pitch: 25,
    });
  });
});
