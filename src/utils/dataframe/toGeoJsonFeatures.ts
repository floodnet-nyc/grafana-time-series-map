import { FieldType } from '@grafana/data';
import type { DataFrame, Field } from '@grafana/data';
import type { Feature, Geometry } from 'geojson';
import type { GeometrySource, FieldMapping } from '../../types';
import { parseGeometry } from '../geometry';

export type GeoFeature = Feature & { __idx: number };

function resolveField(frame: DataFrame, name: string): Field | undefined {
  return frame.fields.find((f) => f.name === name);
}

function resolveValue(field: Field, i: number): unknown {
  const v = field.values[i];
  if (field.type === FieldType.time && typeof v === 'number') {
    return new Date(v);
  }
  return v;
}

export function dataFrameToFeatures(
  frame: DataFrame,
  geometry: GeometrySource,
  fieldMappings: FieldMapping[],
): GeoFeature[] {
  const len = frame.length;
  const features: GeoFeature[] = [];

  let geomField: Field | undefined;
  let latField: Field | undefined;
  let lngField: Field | undefined;

  if (geometry.type === 'wkb' || geometry.type === 'wkt' || geometry.type === 'geojson') {
    geomField = resolveField(frame, geometry.field);
    if (!geomField) return [];
  } else {
    latField = resolveField(frame, geometry.latField);
    lngField = resolveField(frame, geometry.lngField);
    if (!latField || !lngField) return [];
  }

  const resolvedMappings = fieldMappings.map((m) => ({
    alias: m.alias || m.fieldName,
    field: resolveField(frame, m.fieldName),
  }));

  for (let i = 0; i < len; i++) {
    let geom: Geometry | null = null;

    if (geometry.type === 'wkb' || geometry.type === 'wkt') {
      geom = parseGeometry(geomField!.values[i] as string);
    } else if (geometry.type === 'geojson') {
      const raw = geomField!.values[i];
      try {
        geom = typeof raw === 'string' ? JSON.parse(raw) : (raw as Geometry);
      } catch {
        geom = null;
      }
    } else {
      const lat = latField!.values[i] as number;
      const lng = lngField!.values[i] as number;
      if (lat != null && lng != null) {
        geom = { type: 'Point', coordinates: [lng, lat] };
      }
    }

    if (!geom) continue;

    const properties: Record<string, unknown> = {};
    // All fields by original name so time/groupBy fields are available without explicit mapping.
    for (const field of frame.fields) {
      properties[field.name] = resolveValue(field, i);
    }
    // Aliases from fieldMappings override original names.
    for (const { alias, field } of resolvedMappings) {
      if (field) properties[alias] = resolveValue(field, i);
    }

    features.push({
      type: 'Feature',
      id: i,
      geometry: geom,
      properties,
      __idx: i,
    } as GeoFeature);
  }

  return features;
}

export function dataFramesToFeatures(
  frames: DataFrame[],
  refId: string | undefined,
  geometry: GeometrySource,
  fieldMappings: FieldMapping[],
): GeoFeature[] {
  const matching = refId
    ? frames.filter((f) => f.refId === refId)
    : frames.slice(0, 1);

  const all: GeoFeature[] = [];
  let offset = 0;
  for (const frame of matching) {
    const feats = dataFrameToFeatures(frame, geometry, fieldMappings);
    for (const f of feats) {
      f.__idx = offset++;
      all.push(f);
    }
  }
  return all;
}
