import type { Feature } from 'geojson';
import { buildSensorPopupModel } from './SensorPopupModel';

function createFeature(properties: Record<string, unknown>): Feature {
  return {
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [0, 0] },
    properties,
  };
}

describe('buildSensorPopupModel', () => {
  it('prefers depth_inches and formats it for display', () => {
    const model = buildSensorPopupModel('sensor-a', createFeature({ depth_inches: 12.34, value: 9, depth: 8 }));

    expect(model).toEqual({
      sensorLabel: 'sensor-a',
      depthDisplay: '12.3',
      depthUnit: 'in',
    });
  });

  it('falls back to value or depth when depth_inches is absent', () => {
    expect(buildSensorPopupModel('sensor-b', createFeature({ value: 6 }))).toEqual({
      sensorLabel: 'sensor-b',
      depthDisplay: '6.0',
      depthUnit: 'in',
    });

    expect(buildSensorPopupModel('sensor-c', createFeature({ depth: 7.01 }))).toEqual({
      sensorLabel: 'sensor-c',
      depthDisplay: '7.0',
      depthUnit: 'in',
    });
  });

  it('omits depth fields when no numeric depth is present', () => {
    expect(buildSensorPopupModel('sensor-d', createFeature({ depth: 'unknown' }))).toEqual({
      sensorLabel: 'sensor-d',
      depthDisplay: undefined,
      depthUnit: undefined,
    });

    expect(buildSensorPopupModel('sensor-e', null)).toEqual({
      sensorLabel: 'sensor-e',
      depthDisplay: undefined,
      depthUnit: undefined,
    });
  });
});
