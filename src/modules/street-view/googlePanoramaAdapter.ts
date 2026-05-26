import { computeHeading, findMarkerFriendlyPanorama } from './streetViewModel';
import type { StreetViewCoords } from './types';

export interface StreetViewPanoramaSession {
  panorama: google.maps.StreetViewPanorama;
  markerElement: HTMLDivElement | null;
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

  existing?.markerElement?.remove();
  const markerElement = createPanoramaMarker(container, selectedKey);

  return { panorama, markerElement, hostElement: container };
}

export function clearStreetViewPanorama(session: StreetViewPanoramaSession | null, container: HTMLDivElement | null) {
  session?.markerElement?.remove();
  session?.panorama?.setVisible(false);
  if (container) {
    container.innerHTML = '';
  }
}

function createPanoramaMarker(container: HTMLDivElement, selectedKey?: string | null): HTMLDivElement {
  const markerElement = document.createElement('div');
  markerElement.className = 'street-view-widget-marker';
  markerElement.title = selectedKey ?? 'Selected feature';
  markerElement.setAttribute('aria-hidden', 'true');

  const inner = document.createElement('div');
  inner.className = 'street-view-widget-marker-dot';
  markerElement.appendChild(inner);

  container.appendChild(markerElement);
  return markerElement;
}
