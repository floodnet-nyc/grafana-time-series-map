import type {
  GoogleControlPosition,
  GoogleMapOptions,
  MapControlPosition,
  MapPanelOptions,
  SharedMapControlSettings,
} from '../../types';

export interface ResolvedMapControlSettings {
  navigation: {
    enabled: boolean;
    position: MapControlPosition;
    showZoom: boolean;
    showCompass: boolean;
    visualizePitch: boolean;
    visualizeRoll: boolean;
  };
  geolocate: {
    enabled: boolean;
    position: MapControlPosition;
    trackUserLocation: boolean;
  };
  fullscreen: {
    enabled: boolean;
    position: MapControlPosition;
  };
  scale: {
    enabled: boolean;
  };
  google: {
    mapTypeControl: boolean;
    streetViewControl: boolean;
    mapTypeControlPosition: GoogleControlPosition;
    mapTypeControlStyle: NonNullable<GoogleMapOptions['mapTypeControlStyle']>;
    streetViewControlPosition: GoogleControlPosition;
  };
}

function resolveSharedSettings(
  controls: MapPanelOptions['basemap']['controls'],
  controlSettings: SharedMapControlSettings | undefined,
  googleMapOptions: GoogleMapOptions,
): ResolvedMapControlSettings {
  return {
    navigation: {
      enabled: controls?.navigationControl ?? false,
      position: controlSettings?.navigation?.position ?? 'top-right',
      showZoom: controlSettings?.navigation?.showZoom ?? true,
      showCompass: controlSettings?.navigation?.showCompass ?? true,
      visualizePitch: controlSettings?.navigation?.visualizePitch ?? false,
      visualizeRoll: controlSettings?.navigation?.visualizeRoll ?? false,
    },
    geolocate: {
      enabled: controls?.geolocateControl ?? false,
      position: controlSettings?.geolocate?.position ?? 'top-right',
      trackUserLocation: controlSettings?.geolocate?.trackUserLocation ?? false,
    },
    fullscreen: {
      enabled: controls?.fullscreenControl ?? false,
      position: controlSettings?.fullscreen?.position ?? 'top-right',
    },
    scale: {
      enabled: controls?.scaleControl ?? false,
    },
    google: {
      mapTypeControl: googleMapOptions.mapTypeControl ?? false,
      streetViewControl: googleMapOptions.streetViewControl ?? false,
      mapTypeControlPosition: googleMapOptions.mapTypeControlPosition ?? 'TOP_LEFT',
      mapTypeControlStyle: googleMapOptions.mapTypeControlStyle ?? 'DEFAULT',
      streetViewControlPosition: googleMapOptions.streetViewControlPosition ?? 'RIGHT_BOTTOM',
    },
  };
}

export function resolveMapControlSettings(options: MapPanelOptions): ResolvedMapControlSettings {
  const { controls, controlSettings, google } = options.basemap;
  return resolveSharedSettings(controls, controlSettings, google);
}

export function getMaplibreControlPosition(position: MapControlPosition): MapControlPosition {
  return position;
}

