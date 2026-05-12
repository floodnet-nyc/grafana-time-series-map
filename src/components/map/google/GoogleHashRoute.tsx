import { useMap } from '@vis.gl/react-google-maps';
import { useMapHashRoute } from '../../../hooks/useMapHashRoute';

export function GoogleHashRoute({ enabled }: { enabled: boolean }) {
  const map = useMap();

  useMapHashRoute(enabled, (view) => {
    if (!map) {
      return;
    }

    map.moveCamera({
      center: { lat: view.latitude, lng: view.longitude },
      zoom: view.zoom,
      heading: view.bearing,
      tilt: view.pitch,
    });
  });

  return null;
}
