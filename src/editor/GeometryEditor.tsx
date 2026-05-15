import React from 'react';
import { Field, Input, Switch, Combobox, type ComboboxOption } from '@grafana/ui';
import type { ElevationConfig, GeometrySource } from '../types';
import { FieldSelect } from './FieldSelect';

const GEOMETRY_TYPES: Array<ComboboxOption<string>> = [
  { label: 'Lat / Lng columns', value: 'latlng' },
  { label: 'WKB hex', value: 'wkb' },
  { label: 'WKT string', value: 'wkt' },
  { label: 'GeoJSON string', value: 'geojson' },
  { label: 'None', value: 'none' },
];

const ELEVATION_DEFAULTS: ElevationConfig = { field: '', scale: 0.0254, depthTest: false };

interface Props {
  geometry: GeometrySource;
  elevation?: ElevationConfig;
  availableFields: string[];
  onGeometryChange: (geometry: GeometrySource) => void;
  onElevationChange: (elevation: ElevationConfig) => void;
}

export function GeometryEditor({ geometry, elevation, availableFields, onGeometryChange, onElevationChange }: Props) {
  const patchElevation = (updates: Partial<ElevationConfig>) =>
    onElevationChange({ ...ELEVATION_DEFAULTS, ...elevation, ...updates });

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
      <Field label="Elevation field" description="Leave empty to render flat">
        <FieldSelect
          value={elevation?.field ?? ''}
          onChange={(v) => patchElevation({ field: v })}
          availableFields={availableFields}
          placeholder="None"
        />
      </Field>
      {elevation?.field && (
        <>
          <Field label="Elevation scale">
            <Input
              type="number"
              value={String(elevation.scale ?? 0.0254)}
              onChange={(e) => patchElevation({ scale: Number(e.currentTarget.value) })}
            />
          </Field>
          <Field label="Depth test">
            <Switch
              value={elevation.depthTest ?? false}
              onChange={(e) => patchElevation({ depthTest: e.currentTarget.checked })}
            />
          </Field>
        </>
      )}
    </>
  );
}
