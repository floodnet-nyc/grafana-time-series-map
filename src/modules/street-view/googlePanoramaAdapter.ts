import { computeHeading, findMarkerFriendlyPanorama } from './streetViewModel';
import type { StreetViewCoords } from './types';

export interface StreetViewPanoramaSession {
  panorama: google.maps.StreetViewPanorama;
  marker: google.maps.Marker | null;
  hostElement: HTMLDivElement;
}

export interface LoadStreetViewPanoramaArgs {
  container: HTMLDivElement;
  coords: StreetViewCoords;
  selectedKey?: string | null;
  existing: StreetViewPanoramaSession | null;
  maps: typeof google.maps;
}

export async function loadStreetViewPanorama({
  container,
  coords,
  selectedKey,
  existing,
  maps,
}: LoadStreetViewPanoramaArgs): Promise<StreetViewPanoramaSession | null> {
  const service = new maps.StreetViewService();
  const result = await findMarkerFriendlyPanorama(service, maps, coords);
  if (!result?.location?.pano) {
    return null;
  }

  const heading = result.location.latLng ? computeHeading(result.location.latLng, coords) : 0;
  const pov: google.maps.StreetViewPov = { heading, pitch: -10 };
  const panorama =
    existing?.hostElement === container
      ? existing.panorama
      : new maps.StreetViewPanorama(container, {
          pano: result.location.pano,
          pov,
          visible: true,
          addressControl: false,
          motionTracking: false,
          clickToGo: true,
          linksControl: true,
          fullscreenControl: true,
        });

  if (existing?.hostElement === container) {
    panorama.setPano(result.location.pano);
    panorama.setPov(pov);
    panorama.setVisible(true);
  }

  requestAnimationFrame(() => {
    maps.event.trigger(panorama, 'resize');
  });

  let marker: google.maps.Marker | null = null;
  try {
    existing?.marker?.setMap(null);
    marker = new maps.Marker({
      position: coords,
      map: panorama,
      title: selectedKey ?? 'Selected feature',
      icon: {
        path: maps.SymbolPath.CIRCLE,
        scale: 5,
        strokeColor: '#ffffff',
        strokeWeight: 2,
        fillColor: '#3388ff',
        fillOpacity: 1,
      },
    });
  } catch {
    marker = null;
  }

  return { panorama, marker, hostElement: container };
}

export function clearStreetViewPanorama(session: StreetViewPanoramaSession | null, container: HTMLDivElement | null) {
  session?.marker?.setMap(null);
  session?.panorama?.setVisible(false);
  if (container) {
    container.innerHTML = '';
  }
}
