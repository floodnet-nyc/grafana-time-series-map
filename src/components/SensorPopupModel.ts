import type { Feature } from 'geojson';

export interface SensorPopupModel {
  sensorLabel: string;
  depthDisplay?: string;
  depthUnit?: string;
}

export function buildSensorPopupModel(selectedKey: string, feature: Feature | null): SensorPopupModel {
  const properties = feature?.properties ?? {};
  const depthRaw = properties.depth_inches ?? properties.value ?? properties.depth ?? null;
  const depth = depthRaw != null ? Number(depthRaw) : null;

  return {
    sensorLabel: selectedKey,
    depthDisplay: depth != null && Number.isFinite(depth) ? depth.toFixed(1) : undefined,
    depthUnit: depth != null && Number.isFinite(depth) ? 'in' : undefined,
  };
}
