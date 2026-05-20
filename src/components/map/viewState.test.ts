import type { MapPanelOptions } from '../../types';
import { FIT_BOUNDS_MAX_ZOOM, FIT_BOUNDS_PADDING_PX, getFitBoundsKey, getFitBoundsOptions, getInitialViewport, getManualViewport } from 'components/map/MapFitBounds';

function createOptions(overrides: { initialView?: Partial<MapPanelOptions['initialView']> } = {}): MapPanelOptions {
  return {
    basemap: { provider: 'maplibre', maplibre: { mapStyle: 'carto-dark' }, google: {} },
    deck: { parameters: {}, lighting: {}, interleaved: true },
    initialView: {
      mode: 'manual',
      state: { latitude: 40.7, longitude: -73.9, zoom: 11, bearing: 15, pitch: 30 },
      fitData: { source: 'allLayers', padding: FIT_BOUNDS_PADDING_PX, maxZoom: FIT_BOUNDS_MAX_ZOOM },
      ...overrides.initialView,
    },
    layers: [],
    time: { show: false, defaultSpeed: 1, loop: false },
    legend: { show: true },
    tooltip: { show: true },
    popup: { show: true },
    sync: { publish: true, subscribe: true },
  };
}

describe('map view state helpers', () => {
  it('uses a stable fit-bounds key and shared padding', () => {
    expect(FIT_BOUNDS_PADDING_PX).toBe(48);
    expect(FIT_BOUNDS_MAX_ZOOM).toBe(22);
    expect(getFitBoundsKey()).toBeNull();
    expect(getFitBoundsKey([[1, 2], [3, 4]])).toBe('[[1,2],[3,4]]');
  });

  it('builds fit-bounds options from panel settings', () => {
    const options = createOptions({
      initialView: {
        fitData: { source: 'layer', layerId: 'layer-1', padding: 5, maxZoom: 15 },
      },
    });

    expect(getFitBoundsOptions(options)).toEqual({ padding: 5, maxZoom: 15 });
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
    const options = createOptions({ initialView: { state: { latitude: 1, longitude: 2, zoom: 3 } } });

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
