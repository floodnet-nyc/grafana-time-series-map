import type { Feature, Point } from 'geojson';
import type { StreetViewCoords, StreetViewProvider, StreetViewStatus } from './types';

const MIN_MARKER_VISIBILITY_DISTANCE_METERS = 12;
const OFFSET_SEARCH_DISTANCE_METERS = 20;
const OFFSET_SEARCH_BEARINGS = [0, 90, 180, 270, 45, 135, 225, 315];

export function getFeatureCoords(feature?: Feature | null): StreetViewCoords | null {
  if (!feature?.geometry || feature.geometry.type !== 'Point') {
    return null;
  }
  const [lng, lat] = (feature.geometry as Point).coordinates;
  return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
}

export function getMapsUrl(coords: StreetViewCoords | null): string | undefined {
  if (!coords) {
    return undefined;
  }
  return `https://www.google.com/maps/search/?api=1&query=${coords.lat},${coords.lng}`;
}

export function getStreetViewStatusMessage(status: StreetViewStatus, provider?: StreetViewProvider) {
  switch (status) {
    case 'loading':
      return 'Loading Street View...';
    case 'no-selection':
      return 'Select a point feature to preview Street View.';
    case 'no-location':
      return 'The selected feature does not have a point location.';
    case 'unsupported':
      return provider === 'google'
        ? 'Street View is not available yet. Wait for Google Maps to finish loading.'
        : 'Street View requires the Google basemap provider.';
    case 'no-coverage':
      return 'No Street View coverage at this location.';
    case 'idle':
    case 'ready':
    default:
      return '';
  }
}

export function computeHeading(
  from: google.maps.LatLng | google.maps.LatLngLiteral,
  to: google.maps.LatLngLiteral
): number {
  const fromLat = typeof from.lat === 'function' ? from.lat() : from.lat;
  const fromLng = typeof from.lng === 'function' ? from.lng() : from.lng;
  const lat1 = toRadians(fromLat);
  const lat2 = toRadians(to.lat);
  const deltaLng = toRadians(to.lng - fromLng);
  const y = Math.sin(deltaLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(deltaLng);
  return (toDegrees(Math.atan2(y, x)) + 360) % 360;
}

export async function findMarkerFriendlyPanorama(
  service: google.maps.StreetViewService,
  maps: typeof google.maps,
  target: google.maps.LatLngLiteral
): Promise<google.maps.StreetViewPanoramaData | null> {
  const primary = await getPanorama(service, maps, target, 75);
  if (!primary) {
    return null;
  }

  const primaryDistance = primary.location?.latLng ? distanceMeters(primary.location.latLng, target) : Infinity;
  if (primaryDistance >= MIN_MARKER_VISIBILITY_DISTANCE_METERS) {
    return primary;
  }

  for (const bearing of OFFSET_SEARCH_BEARINGS) {
    const offsetTarget = offsetLatLng(target, OFFSET_SEARCH_DISTANCE_METERS, bearing);
    const candidate = await getPanorama(service, maps, offsetTarget, 75);
    if (!candidate?.location?.latLng) {
      continue;
    }
    const candidateDistance = distanceMeters(candidate.location.latLng, target);
    if (candidateDistance >= MIN_MARKER_VISIBILITY_DISTANCE_METERS) {
      return candidate;
    }
  }

  return primary;
}

function getPanorama(
  service: google.maps.StreetViewService,
  maps: typeof google.maps,
  location: google.maps.LatLngLiteral,
  radius: number
): Promise<google.maps.StreetViewPanoramaData | null> {
  return new Promise((resolve) => {
    service.getPanorama({ location, radius }, (data, status) => {
      if (status !== maps.StreetViewStatus.OK || !data?.location?.pano) {
        resolve(null);
        return;
      }
      resolve(data);
    });
  });
}

function distanceMeters(
  from: google.maps.LatLng | google.maps.LatLngLiteral,
  to: google.maps.LatLngLiteral
): number {
  const fromLat = typeof from.lat === 'function' ? from.lat() : from.lat;
  const fromLng = typeof from.lng === 'function' ? from.lng() : from.lng;
  const lat1 = toRadians(fromLat);
  const lat2 = toRadians(to.lat);
  const deltaLat = toRadians(to.lat - fromLat);
  const deltaLng = toRadians(to.lng - fromLng);
  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);
  return 6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function offsetLatLng(
  origin: google.maps.LatLngLiteral,
  distanceMetersValue: number,
  bearingDegrees: number
): google.maps.LatLngLiteral {
  const angularDistance = distanceMetersValue / 6371000;
  const bearing = toRadians(bearingDegrees);
  const lat1 = toRadians(origin.lat);
  const lng1 = toRadians(origin.lng);

  const sinLat1 = Math.sin(lat1);
  const cosLat1 = Math.cos(lat1);
  const sinAngular = Math.sin(angularDistance);
  const cosAngular = Math.cos(angularDistance);

  const lat2 = Math.asin(sinLat1 * cosAngular + cosLat1 * sinAngular * Math.cos(bearing));
  const lng2 =
    lng1 +
    Math.atan2(
      Math.sin(bearing) * sinAngular * cosLat1,
      cosAngular - sinLat1 * Math.sin(lat2)
    );

  return {
    lat: toDegrees(lat2),
    lng: ((toDegrees(lng2) + 540) % 360) - 180,
  };
}

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

function toDegrees(value: number) {
  return (value * 180) / Math.PI;
}
