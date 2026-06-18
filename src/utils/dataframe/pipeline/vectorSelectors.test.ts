import type { Feature } from 'geojson';
import { createSourceRef } from '../../../layers/defaults';
import type { TripsLayerConfig } from '../../../layers/trips';
import { buildGroupedVectorPackedByLayerId, buildPreparedGroupedVectorsByLayerId } from './vectorSelectors';

function createPointFeature(
  coordinates: number[],
  properties: Record<string, unknown> = {},
  index = 0
): Feature & { __idx: number } {
  return {
    type: 'Feature',
    geometry: {
      type: 'Point',
      coordinates,
    },
    properties,
    __idx: index,
  };
}

function createConfig(overrides: Partial<TripsLayerConfig> = {}): TripsLayerConfig {
  return {
    id: 'trips-1',
    type: 'trips',
    label: 'Trips',
    visible: true,
    data: { featureSource: { id: 'main', refId: '' } },
    geometry: {
      type: 'latlng',
      lat: createSourceRef('lat'),
      lng: createSourceRef('lng'),
    } as any,
    timeFilter: {
      mode: 'asof',
      time: createSourceRef('time'),
      groupBy: createSourceRef('trip_id'),
    },
    opacity: 1,
    settings: {
      timestamps: createSourceRef(),
      timestampUnit: 'ms',
      trailLengthMs: 300000,
      fadeTrail: true,
      widthMinPixels: 2,
      widthMaxPixels: 8,
      width: createSourceRef(),
      widthScale: 1,
      capRounded: true,
      jointRounded: true,
    },
    ...overrides,
  };
}

describe('vectorSelectors', () => {
  it('groups point rows into ordered trip vectors and picks the closest representative row', () => {
    const config = createConfig();
    const features = [
      createPointFeature([-73.9, 40.7], { trip_id: 'A', time: 1000 }, 0),
      createPointFeature([-73.8, 40.8], { trip_id: 'A', time: 2000 }, 1),
      createPointFeature([-73.7, 40.6], { trip_id: 'A', time: 3000 }, 2),
      createPointFeature([-73.6, 40.5], { trip_id: 'B', time: 1500 }, 3),
      createPointFeature([-73.5, 40.4], { trip_id: 'B', time: 2500 }, 4),
    ];
    const tablesByLayerId = new Map([[config.id, features]]);

    const packedByLayerId = buildGroupedVectorPackedByLayerId([config], tablesByLayerId);
    const preparedByLayerId = buildPreparedGroupedVectorsByLayerId([config], tablesByLayerId, packedByLayerId, 2400);
    const prepared = preparedByLayerId.get(config.id)!;

    expect(prepared.data).toEqual([{ __idx: 1 }, { __idx: 4 }]);
    expect(prepared.pathByIndex.get(1)).toEqual([
      [-73.9, 40.7],
      [-73.8, 40.8],
      [-73.7, 40.6],
    ]);
    expect(prepared.numericArrayByField.get('time')?.get(1)).toEqual([1000, 2000, 3000]);
    expect(prepared.pathByIndex.get(4)).toEqual([
      [-73.6, 40.5],
      [-73.5, 40.4],
    ]);
    expect(prepared.numericArrayByField.get('time')?.get(4)).toEqual([1500, 2500]);
  });

  it('only prepares grouped vectors for layers with point-row grouping semantics', () => {
    const config = createConfig({
      geometry: { type: 'wkt', value: createSourceRef('geom') } as any,
      timeFilter: { mode: 'none', time: createSourceRef() },
    });
    const features = [
      {
        type: 'Feature',
        geometry: { type: 'LineString', coordinates: [[-73.9, 40.7, 1000], [-73.8, 40.8, 2000]] },
        properties: {},
        __idx: 0,
      } as Feature & { __idx: number },
    ];
    const tablesByLayerId = new Map([[config.id, features]]);

    const packedByLayerId = buildGroupedVectorPackedByLayerId([config], tablesByLayerId);
    const preparedByLayerId = buildPreparedGroupedVectorsByLayerId([config], tablesByLayerId, packedByLayerId, 1500);
    expect(preparedByLayerId.has(config.id)).toBe(false);
  });
});
