import React from 'react';
import { Field, Combobox, type ComboboxOption } from '@grafana/ui';
import type { GeometrySource } from '../types';
import { createSourceRef } from '../layers/defaults';
import { SourceRefEditor } from './SourceRefEditor';

const GEOMETRY_TYPES: Array<ComboboxOption<string>> = [
  { label: 'Lat / Lng columns', value: 'latlng' },
  { label: 'WKB hex', value: 'wkb' },
  { label: 'WKT string', value: 'wkt' },
  { label: 'GeoJSON string', value: 'geojson' },
  { label: 'None', value: 'none' },
];

interface Props {
  geometry: GeometrySource;
  sourceOptions: Array<{ id: string; label: string }>;
  fieldsBySource: Record<string, string[]>;
  onGeometryChange: (geometry: GeometrySource) => void;
}

export function GeometryEditor({ geometry, sourceOptions, fieldsBySource, onGeometryChange }: Props) {
  const defaultSource = sourceOptions[0]?.id;

  const handleGeometryType = (type: GeometrySource['type']) => {
    const next: GeometrySource =
      type === 'none'
        ? { type: 'none' }
        : type === 'latlng'
          ? { type: 'latlng', lat: createSourceRef('', defaultSource), lng: createSourceRef('', defaultSource) }
          : { type, value: createSourceRef('', defaultSource) };
    onGeometryChange(next);
  };

  return (
    <>
      <Field label="Geometry source">
        <Combobox
          options={GEOMETRY_TYPES}
          value={geometry.type}
          onChange={(v) => handleGeometryType(v.value as GeometrySource['type'])}
        />
      </Field>
      {(geometry.type === 'wkb' || geometry.type === 'wkt' || geometry.type === 'geojson') && (
        <Field label="Geometry field">
          <SourceRefEditor
            value={geometry.value}
            onChange={(value) => onGeometryChange({ ...geometry, value })}
            sourceOptions={sourceOptions}
            fieldsBySource={fieldsBySource}
          />
        </Field>
      )}
      {geometry.type === 'latlng' && (
        <>
          <Field label="Latitude field">
            <SourceRefEditor
              value={geometry.lat}
              onChange={(lat) => onGeometryChange({ ...geometry, lat })}
              sourceOptions={sourceOptions}
              fieldsBySource={fieldsBySource}
            />
          </Field>
          <Field label="Longitude field">
            <SourceRefEditor
              value={geometry.lng}
              onChange={(lng) => onGeometryChange({ ...geometry, lng })}
              sourceOptions={sourceOptions}
              fieldsBySource={fieldsBySource}
            />
          </Field>
        </>
      )}
    </>
  );
}
