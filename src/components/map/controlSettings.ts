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
  fullscreen: {
    enabled: boolean;
    position: MapControlPosition;
  };
  scale: {
    enabled: boolean;
  };
  google: {
    mapTypeControl: boolean;
    mapTypeControlPosition: GoogleControlPosition;
    mapTypeControlStyle: NonNullable<GoogleMapOptions['mapTypeControlStyle']>;
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
    fullscreen: {
      enabled: controls?.fullscreenControl ?? false,
      position: controlSettings?.fullscreen?.position ?? 'top-right',
    },
    scale: {
      enabled: controls?.scaleControl ?? false,
    },
    google: {
      mapTypeControl: googleMapOptions.mapTypeControl ?? false,
      mapTypeControlPosition: googleMapOptions.mapTypeControlPosition ?? 'TOP_LEFT',
      mapTypeControlStyle: googleMapOptions.mapTypeControlStyle ?? 'DEFAULT',
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
