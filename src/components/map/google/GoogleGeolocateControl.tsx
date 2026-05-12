import { useEffect } from 'react';
import { ControlPosition, useMap } from '@vis.gl/react-google-maps';

export function GoogleGeolocateControl({ enabled }: { enabled: boolean }) {
  const map = useMap();

  useEffect(() => {
    if (!enabled || !map || typeof navigator === 'undefined') {
      return;
    }

    const button = document.createElement('button');
    button.type = 'button';
    button.title = 'Find my location';
    button.setAttribute('aria-label', 'Find my location');
    button.textContent = '◎';
    Object.assign(button.style, {
      background: '#fff',
      border: '0',
      borderRadius: '2px',
      boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
      color: '#333',
      cursor: 'pointer',
      fontSize: '20px',
      height: '40px',
      lineHeight: '40px',
      margin: '10px',
      padding: '0',
      textAlign: 'center',
      width: '40px',
    });

    const infoWindow = new google.maps.InfoWindow();
    const handleClick = () => {
      if (!navigator.geolocation) {
        infoWindow.setPosition(map.getCenter());
        infoWindow.setContent("Error: Your browser doesn't support geolocation.");
        infoWindow.open(map);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const center = { lat: position.coords.latitude, lng: position.coords.longitude };
          infoWindow.setPosition(center);
          infoWindow.setContent('Location found.');
          infoWindow.open(map);
          map.setCenter(center);
          map.setZoom(Math.max(map.getZoom() ?? 0, 14));
        },
        () => {
          infoWindow.setPosition(map.getCenter());
          infoWindow.setContent('Error: The Geolocation service failed.');
          infoWindow.open(map);
        },
        { enableHighAccuracy: true },
      );
    };

    button.addEventListener('click', handleClick);
    const controls = map.controls[ControlPosition.TOP_RIGHT];
    controls.push(button);

    return () => {
      button.removeEventListener('click', handleClick);
      const index = controls.getArray().indexOf(button);
      if (index >= 0) {
        controls.removeAt(index);
      }
      infoWindow.close();
    };
  }, [enabled, map]);

  return null;
}
