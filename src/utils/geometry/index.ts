import { HexWKBLoader, WKTLoader } from '@loaders.gl/wkt';
import type { Geometry } from 'geojson';

const HEX_RE = /^[0-9a-fA-F]+$/;

export function parseGeometry(raw: string | null | undefined): Geometry | null {
  if (!raw) return null;
  const s = raw.trim();

  // WKB / EWKB hex string (PostGIS default output)
  if (HEX_RE.test(s) && s.length % 2 === 0) {
    try {
      return HexWKBLoader.parseTextSync(s) as Geometry;
    } catch {
      // fall through to WKT attempt
    }
  }

  // WKT / EWKT
  try {
    return WKTLoader.parseTextSync(s) as Geometry;
  } catch {
    return null;
  }
}
