import React from 'react';
import { Field, Combobox, type ComboboxOption } from '@grafana/ui';
import type { GeometrySource } from '../types';
import { FieldSelect } from './FieldSelect';

const GEOMETRY_TYPES: Array<ComboboxOption<string>> = [
  { label: 'Lat / Lng columns', value: 'latlng' },
  { label: 'WKB hex', value: 'wkb' },
  { label: 'WKT string', value: 'wkt' },
  { label: 'GeoJSON string', value: 'geojson' },
  { label: 'None', value: 'none' },
];

interface Props {
  geometry: GeometrySource;
  availableFields: string[];
  onGeometryChange: (geometry: GeometrySource) => void;
}

export function GeometryEditor({ geometry, availableFields, onGeometryChange }: Props) {
  const handleGeometryType = (type: GeometrySource['type']) => {
    const next: GeometrySource =
      type === 'none'
        ? { type: 'none' }
        : type === 'latlng'
          ? { type: 'latlng', latField: '', lngField: '' }
          : { type, field: '' };
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
          <FieldSelect
            value={geometry.field}
            onChange={(v) => onGeometryChange({ ...geometry, field: v })}
            availableFields={availableFields}
          />
        </Field>
      )}
      {geometry.type === 'latlng' && (
        <>
          <Field label="Latitude field">
            <FieldSelect
              value={geometry.latField}
              onChange={(v) => onGeometryChange({ ...geometry, latField: v })}
              availableFields={availableFields}
            />
          </Field>
          <Field label="Longitude field">
            <FieldSelect
              value={geometry.lngField}
              onChange={(v) => onGeometryChange({ ...geometry, lngField: v })}
              availableFields={availableFields}
            />
          </Field>
        </>
      )}
    </>
  );
}
