import { ColorScheme, ControlPosition } from '@vis.gl/react-google-maps';
import type { GoogleControlPosition, GoogleMapTypeControlStyle, MapControlPosition, MapThemeMode } from '../../../types';

const googleControlPositionValues: Record<GoogleControlPosition, google.maps.ControlPosition> = {
  BLOCK_START_INLINE_START: ControlPosition.BLOCK_START_INLINE_START,
  BLOCK_START_INLINE_CENTER: ControlPosition.BLOCK_START_INLINE_CENTER,
  BLOCK_START_INLINE_END: ControlPosition.BLOCK_START_INLINE_END,
  INLINE_START_BLOCK_START: ControlPosition.INLINE_START_BLOCK_START,
  INLINE_START_BLOCK_CENTER: ControlPosition.INLINE_START_BLOCK_CENTER,
  INLINE_START_BLOCK_END: ControlPosition.INLINE_START_BLOCK_END,
  INLINE_END_BLOCK_START: ControlPosition.INLINE_END_BLOCK_START,
  INLINE_END_BLOCK_CENTER: ControlPosition.INLINE_END_BLOCK_CENTER,
  INLINE_END_BLOCK_END: ControlPosition.INLINE_END_BLOCK_END,
  BLOCK_END_INLINE_START: ControlPosition.BLOCK_END_INLINE_START,
  BLOCK_END_INLINE_CENTER: ControlPosition.BLOCK_END_INLINE_CENTER,
  BLOCK_END_INLINE_END: ControlPosition.BLOCK_END_INLINE_END,
  TOP_LEFT: ControlPosition.TOP_LEFT,
  TOP_CENTER: ControlPosition.TOP_CENTER,
  TOP_RIGHT: ControlPosition.TOP_RIGHT,
  LEFT_TOP: ControlPosition.LEFT_TOP,
  LEFT_CENTER: ControlPosition.LEFT_CENTER,
  LEFT_BOTTOM: ControlPosition.LEFT_BOTTOM,
  RIGHT_TOP: ControlPosition.RIGHT_TOP,
  RIGHT_CENTER: ControlPosition.RIGHT_CENTER,
  RIGHT_BOTTOM: ControlPosition.RIGHT_BOTTOM,
  BOTTOM_LEFT: ControlPosition.BOTTOM_LEFT,
  BOTTOM_CENTER: ControlPosition.BOTTOM_CENTER,
  BOTTOM_RIGHT: ControlPosition.BOTTOM_RIGHT,
};

const googleColorSchemeValues: Record<MapThemeMode, typeof ColorScheme[keyof typeof ColorScheme]> = {
  light: ColorScheme.LIGHT,
  dark: ColorScheme.DARK,
  auto: ColorScheme.FOLLOW_SYSTEM,
};

export const mapTypeControlStyleValues: Record<GoogleMapTypeControlStyle, google.maps.MapTypeControlStyle> = {
  DEFAULT: 0 as google.maps.MapTypeControlStyle,
  DROPDOWN_MENU: 2 as google.maps.MapTypeControlStyle,
  HORIZONTAL_BAR: 1 as google.maps.MapTypeControlStyle,
};

export function getControlPosition(position: GoogleControlPosition | undefined, fallback: GoogleControlPosition) {
  return googleControlPositionValues[position ?? fallback];
}

function mapControlToGooglePosition(position: MapControlPosition): GoogleControlPosition {
  switch (position) {
    case 'top-left':     return 'TOP_LEFT';
    case 'top-right':    return 'TOP_RIGHT';
    case 'bottom-left':  return 'BOTTOM_LEFT';
    case 'bottom-right': return 'BOTTOM_RIGHT';
    default:             return 'TOP_RIGHT';
  }
}

export function getCameraControlPosition(position: MapControlPosition): GoogleControlPosition {
  return mapControlToGooglePosition(position);
}

export function getFullscreenControlPosition(position: MapControlPosition): GoogleControlPosition {
  return mapControlToGooglePosition(position);
}

export function getGoogleColorScheme(colorScheme: MapThemeMode | undefined) {
  return googleColorSchemeValues[colorScheme ?? 'light'];
}
