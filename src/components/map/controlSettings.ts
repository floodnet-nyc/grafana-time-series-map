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

function toGooglePosition(position: MapControlPosition, fallback: GoogleControlPosition): GoogleControlPosition {
  switch (position) {
    case 'top-left':
      return 'TOP_LEFT';
    case 'bottom-left':
      return 'BOTTOM_LEFT';
    case 'bottom-right':
      return 'BOTTOM_RIGHT';
    case 'top-right':
    default:
      return fallback;
  }
}

function resolveSharedSettings(
  controls: MapPanelOptions['controls'],
  controlSettings: SharedMapControlSettings | undefined,
  googleMapOptions: GoogleMapOptions | undefined,
): ResolvedMapControlSettings {
  return {
    navigation: {
      enabled: controls?.navigationControl ?? true,
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
      mapTypeControl: googleMapOptions?.mapTypeControl ?? false,
      streetViewControl: googleMapOptions?.streetViewControl ?? false,
      mapTypeControlPosition: googleMapOptions?.mapTypeControlPosition ?? 'TOP_LEFT',
      mapTypeControlStyle: googleMapOptions?.mapTypeControlStyle ?? 'DEFAULT',
      streetViewControlPosition: googleMapOptions?.streetViewControlPosition ?? 'RIGHT_BOTTOM',
    },
  };
}

export function resolveMapControlSettings(options: MapPanelOptions): ResolvedMapControlSettings {
  return resolveSharedSettings(options.controls, options.controlSettings, options.googleMapOptions);
}

export function getMaplibreControlPosition(position: MapControlPosition): 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' {
  return position;
}

export function getGoogleCameraControlPosition(position: MapControlPosition) {
  return toGooglePosition(position, 'INLINE_START_BLOCK_END');
}

export function getGoogleFullscreenControlPosition(position: MapControlPosition) {
  return toGooglePosition(position, 'TOP_RIGHT');
}
