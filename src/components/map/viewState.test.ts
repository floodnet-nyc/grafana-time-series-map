import type { MapPanelOptions } from '../../types';
import { FIT_BOUNDS_PADDING_PX, getFitBoundsKey, getInitialViewport, getManualViewport } from './viewState';

function createOptions(overrides: Partial<MapPanelOptions> = {}): MapPanelOptions {
  return {
    basemapProvider: 'maplibre',
    maplibreStyle: 'carto-dark',
    initialViewMode: 'manual',
    initialViewState: { latitude: 40.7, longitude: -73.9, zoom: 11, bearing: 15, pitch: 30 },
    layers: [],
    defaultPlaybackSpeed: 1,
    loopPlayback: false,
    showTimeControls: false,
    showLegend: true,
    interleaved: true,
    syncPublish: true,
    syncSubscribe: true,
    ...overrides,
  };
}

describe('map view state helpers', () => {
  it('uses a stable fit-bounds key and shared padding', () => {
    expect(FIT_BOUNDS_PADDING_PX).toBe(48);
    expect(getFitBoundsKey()).toBeNull();
    expect(getFitBoundsKey([[1, 2], [3, 4]])).toBe('[[1,2],[3,4]]');
  });

  it('builds a manual viewport from panel options', () => {
    expect(getManualViewport(createOptions())).toEqual({
      latitude: 40.7,
      longitude: -73.9,
      zoom: 11,
      bearing: 15,
      pitch: 30,
    });
  });

  it('prefers hash view when present', () => {
    const options = createOptions({ initialViewState: { latitude: 1, longitude: 2, zoom: 3 } });

    expect(
      getInitialViewport(options, {
        latitude: 9,
        longitude: 8,
        zoom: 7,
        bearing: 6,
        pitch: 5,
      })
    ).toEqual({
      latitude: 9,
      longitude: 8,
      zoom: 7,
      bearing: 6,
      pitch: 5,
    });
  });

  it('falls back to the manual viewport when there is no hash view', () => {
    const options = createOptions();
    expect(getInitialViewport(options)).toEqual(getManualViewport(options));
  });
});
