import { DataFrame, Field, FieldType } from '@grafana/data';
import type { Feature, Geometry } from 'geojson';
import type { GeometrySource } from '../../types';
import { DEFAULT_FEATURE_SOURCE_ID } from '../../layers/defaults';
import { parseGeometry } from './geometry';

export interface LayerRowRef {
  frameIndex: number;
  rowIndex: number;
}

export interface LayerDatum {
  __idx: number;
}

export interface LayerTable {
  frames: DataFrame[];
  rowRefs: LayerRowRef[];
  geometry: Array<Geometry | null>;
  data: LayerDatum[];
  featureSourceId: string;
  legacyFeatures?: Array<Feature & { __idx: number }>;
}

export type LayerTablesByLayerId = Map<string, LayerTable>;
export type LayerTableLike = LayerTable | Array<Feature & { __idx: number }>;

function resolveField(frame: DataFrame, name: string): Field | undefined {
  return frame.fields.find((f) => f.name === name);
}

function resolveValue(field: Field, i: number): unknown {
  const value = field.values[i];
  if (field.type === FieldType.time && typeof value === 'number') {
    return new Date(value);
  }
  return value;
}

function parseRowGeometry(frame: DataFrame, rowIndex: number, geometry: GeometrySource, featureSourceId: string): Geometry | null {
  let geomField: Field | undefined;
  let latField: Field | undefined;
  let lngField: Field | undefined;

  if (geometry.type === 'none') {
    return null;
  }

  if (geometry.type === 'wkb' || geometry.type === 'wkt' || geometry.type === 'geojson') {
    if (geometry.value.source !== featureSourceId) {
      return null;
    }
    geomField = resolveField(frame, geometry.value.field);
    if (!geomField) {
      return null;
    }
  } else if (geometry.type === 'latlng') {
    if (geometry.lat.source !== featureSourceId || geometry.lng.source !== featureSourceId) {
      return null;
    }
    latField = resolveField(frame, geometry.lat.field);
    lngField = resolveField(frame, geometry.lng.field);
    if (!latField || !lngField) {
      return null;
    }
  }

  if (geometry.type === 'wkb' || geometry.type === 'wkt') {
    return parseGeometry(geomField!.values[rowIndex] as string);
  }
  if (geometry.type === 'geojson') {
    const raw = geomField!.values[rowIndex];
    try {
      return typeof raw === 'string' ? JSON.parse(raw) : (raw as Geometry);
    } catch {
      return null;
    }
  }
  if (geometry.type === 'latlng') {
    const lat = latField!.values[rowIndex] as number;
    const lng = lngField!.values[rowIndex] as number;
    if (lat != null && lng != null) {
      return { type: 'Point', coordinates: [lng, lat] };
    }
  }

  return null;
}

export function dataFramesToLayerTable(
  frames: DataFrame[],
  refId: string | undefined,
  geometrySource: GeometrySource,
  elevationField: string | undefined,
  featureSourceId = DEFAULT_FEATURE_SOURCE_ID,
): LayerTable {
  const matchingFrames = refId ? frames.filter((frame) => frame.refId === refId) : frames.slice(0, 1);
  const entries: Array<{ rowRef: LayerRowRef; geometry: Geometry | null }> = [];

  matchingFrames.forEach((frame, frameIndex) => {
    for (let rowIndex = 0; rowIndex < frame.length; rowIndex += 1) {
      entries.push({
        rowRef: { frameIndex, rowIndex },
        geometry: parseRowGeometry(frame, rowIndex, geometrySource, featureSourceId),
      });
    }
  });

  if (elevationField) {
    entries.sort((left, right) => {
      const leftValue = Number(getRowValueFromFrames(matchingFrames, left.rowRef, elevationField));
      const rightValue = Number(getRowValueFromFrames(matchingFrames, right.rowRef, elevationField));
      const leftZ = Number.isFinite(leftValue) ? leftValue : 0;
      const rightZ = Number.isFinite(rightValue) ? rightValue : 0;
      return rightZ - leftZ;
    });
  }

  return {
    frames: matchingFrames,
    rowRefs: entries.map((entry) => entry.rowRef),
    geometry: entries.map((entry) => entry.geometry),
    data: entries.map((_, index) => ({ __idx: index })),
    featureSourceId,
  };
}

export function featureArrayToLayerTable(features: Array<Feature & { __idx: number }>, featureSourceId = DEFAULT_FEATURE_SOURCE_ID): LayerTable {
  return {
    frames: [],
    rowRefs: features.map((_feature, index) => ({ frameIndex: 0, rowIndex: index })),
    geometry: features.map((feature) => feature.geometry ?? null),
    data: features.map((feature, index) => ({ __idx: feature.__idx ?? index })),
    featureSourceId,
    legacyFeatures: features,
  };
}

export function coerceLayerTable(tableLike: LayerTableLike, featureSourceId = DEFAULT_FEATURE_SOURCE_ID): LayerTable {
  return Array.isArray(tableLike) ? featureArrayToLayerTable(tableLike, featureSourceId) : tableLike;
}

function getRowValueFromFrames(frames: DataFrame[], rowRef: LayerRowRef, fieldName: string): unknown {
  const frame = frames[rowRef.frameIndex];
  if (!frame) {
    return undefined;
  }
  const field = resolveField(frame, fieldName);
  if (!field) {
    return undefined;
  }
  return resolveValue(field, rowRef.rowIndex);
}

export function getRowValue(table: LayerTable, index: number, fieldName: string): unknown {
  if (table.legacyFeatures) {
    return table.legacyFeatures[index]?.properties?.[fieldName];
  }
  const rowRef = table.rowRefs[index];
  if (!rowRef) {
    return undefined;
  }
  return getRowValueFromFrames(table.frames, rowRef, fieldName);
}

export function getRowProperties(table: LayerTable, index: number): Record<string, unknown> {
  if (table.legacyFeatures) {
    return { ...(table.legacyFeatures[index]?.properties ?? {}) };
  }
  const rowRef = table.rowRefs[index];
  const frame = rowRef ? table.frames[rowRef.frameIndex] : undefined;
  if (!frame || !rowRef) {
    return {};
  }
  return Object.fromEntries(frame.fields.map((field) => [field.name, resolveValue(field, rowRef.rowIndex)]));
}

export function getRowGeometry(table: LayerTable, index: number): Geometry | null {
  return table.geometry[index] ?? null;
}

export function buildFeatureAt(table: LayerTable, index: number): Feature & { __idx: number } {
  if (table.legacyFeatures) {
    return table.legacyFeatures[index];
  }
  const geometry = getRowGeometry(table, index);
  const rowRef = table.rowRefs[index];
  const frame = rowRef ? table.frames[rowRef.frameIndex] : undefined;
  const properties: Record<string, unknown> = {};

  if (frame && rowRef) {
    for (const field of frame.fields) {
      properties[field.name] = resolveValue(field, rowRef.rowIndex);
    }
  }

  return {
    type: 'Feature',
    geometry: geometry as any,
    properties,
    id: rowRef?.rowIndex,
    __idx: index,
  };
}

export function buildFeatureCollection(table: LayerTable): Array<Feature & { __idx: number }> {
  return table.data.map((_, index) => buildFeatureAt(table, index));
}
