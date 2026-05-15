import type { MapPanelOptions } from '../../types';
import {
  getMaplibreControlPosition,
  resolveMapControlSettings,
} from './controlSettings';
import {
  getCameraControlPosition,
  getFullscreenControlPosition,
} from './google/controlMappings';

function createOptions(overrides: { basemap?: Partial<MapPanelOptions['basemap']> } = {}): MapPanelOptions {
  return {
    basemap: { provider: 'maplibre', maplibre: { mapStyle: 'carto-dark' }, google: {}, ...overrides.basemap },
    deck: { parameters: {}, lighting: {}, interleaved: true },
    initialView: { mode: 'manual', state: { latitude: 0, longitude: 0, zoom: 1 } },
    layers: [],
    time: { show: false, defaultSpeed: 1, loop: false },
    legend: { show: true },
    tooltip: { show: true },
    popup: { show: true },
    sync: { publish: true, subscribe: true },
  };
}

describe('controlSettings', () => {
  it('resolves shared defaults from the common control surface', () => {
    const resolved = resolveMapControlSettings(
      createOptions({
        basemap: {
          controls: {
            navigationControl: true,
            geolocateControl: true,
            fullscreenControl: true,
            scaleControl: true,
          },
        },
      })
    );

    // expect(resolved.navigation).toEqual({
    //   enabled: true,
    //   position: 'top-right',
    //   showZoom: true,
    //   showCompass: true,
    //   visualizePitch: false,
    //   visualizeRoll: false,
    // });
    expect(resolved.geolocate).toEqual({
      enabled: true,
      position: 'top-right',
      trackUserLocation: false,
    });
    expect(resolved.fullscreen).toEqual({
      enabled: true,
      position: 'top-right',
    });
    expect(resolved.scale).toEqual({ enabled: true });
    expect(resolved.google).toEqual({
      mapTypeControl: false,
      streetViewControl: false,
      mapTypeControlPosition: 'TOP_LEFT',
      mapTypeControlStyle: 'DEFAULT',
      streetViewControlPosition: 'RIGHT_BOTTOM',
    });
  });

  it('prefers new shared control settings over provider-specific fallbacks', () => {
    const resolved = resolveMapControlSettings(
      createOptions({
        basemap: {
          controlSettings: {
            // navigation: {
            //   position: 'bottom-left',
            //   showZoom: false,
            //   showCompass: false,
            //   visualizePitch: true,
            //   visualizeRoll: true,
            // },
            geolocate: {
              position: 'bottom-right',
              trackUserLocation: true,
            },
            fullscreen: {
              position: 'top-left',
            },
          },
          controls: {
            navigationControl: true,
            geolocateControl: true,
            fullscreenControl: true,
            scaleControl: false,
          },
        },
      })
    );

    // expect(resolved.navigation.position).toBe('bottom-left');
    // expect(resolved.navigation.showZoom).toBe(false);
    // expect(resolved.navigation.showCompass).toBe(false);
    // expect(resolved.navigation.visualizePitch).toBe(true);
    // expect(resolved.navigation.visualizeRoll).toBe(true);
    expect(resolved.geolocate).toEqual({
      enabled: true,
      position: 'bottom-right',
      trackUserLocation: true,
    });
    expect(resolved.fullscreen).toEqual({
      enabled: true,
      position: 'top-left',
    });
  });

  it('maps shared positions back to provider-specific positions', () => {
    expect(getMaplibreControlPosition('bottom-right')).toBe('bottom-right');
    expect(getCameraControlPosition('top-left')).toBe('TOP_LEFT');
    expect(getCameraControlPosition('top-right')).toBe('INLINE_START_BLOCK_END');
    expect(getFullscreenControlPosition('bottom-left')).toBe('BOTTOM_LEFT');
  });
});
