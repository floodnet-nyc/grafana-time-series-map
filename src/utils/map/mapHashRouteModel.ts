import type { MapHashView } from '../../hooks/useMapHashRoute';

export const HASH_VIEW_KEY = 'v';

function round(value: number, precision: number) {
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
}

export function parseMapHashViewFromHash(hash: string): MapHashView | null {
  const normalizedHash = hash.replace(/^#/, '');
  const part = normalizedHash.split('&').find((item) => item.startsWith(`${HASH_VIEW_KEY}=`));
  if (!part) {
    return null;
  }

  const values = decodeURIComponent(part.slice(HASH_VIEW_KEY.length + 1))
    .split('/')
    .map(Number);
  const [zoom, latitude, longitude, bearing = 0, pitch = 0] = values;
  if (![zoom, latitude, longitude, bearing, pitch].every(Number.isFinite)) {
    return null;
  }

  return { zoom, latitude, longitude, bearing, pitch };
}

export function formatMapHashView(view: MapHashView): string {
  return [
    round(view.zoom, 2),
    round(view.latitude, 6),
    round(view.longitude, 6),
    round(view.bearing, 1),
    round(view.pitch, 1),
  ].join('/');
}

export function upsertMapHashView(hash: string, view: MapHashView): string {
  const normalizedHash = hash.replace(/^#/, '');
  const parts = normalizedHash ? normalizedHash.split('&').filter(Boolean) : [];
  const nextPart = `${HASH_VIEW_KEY}=${formatMapHashView(view)}`;
  const index = parts.findIndex((part) => part.startsWith(`${HASH_VIEW_KEY}=`));

  if (index >= 0) {
    parts[index] = nextPart;
  } else {
    parts.push(nextPart);
  }

  return `#${parts.join('&')}`;
}
