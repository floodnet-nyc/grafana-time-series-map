import { useMemo } from 'react';
import type { Feature } from 'geojson';
import type { GeoFeature } from './toGeoJsonFeatures';
import { DataFrame } from '@grafana/data';

type PackedSeries = {
  times: Float64Array;
  indices: Uint32Array;
};

const dateAsNumber = (date: Date | number) => date instanceof Date ? date.getTime() : date;

export function buildPackedFromAccessors(
  n: number,
  getKey?: (i: number) => any,
  getTime?: (i: number) => number,
): { 
    keyIndex: Map<string, number>; 
    buckets: PackedSeries[] 
} {
    if (!n || !getTime) return { keyIndex: new Map(), buckets: [] };

    const keyIndex = new Map<string, number>();
    let counter = 0;
    const tmp: Record<number, Array<{ t: number; i: number }>> = {};
    for (let i = 0; i < n; i++) {
        const key = getKey ? String(getKey(i) ?? '') : '';
        if (!keyIndex.has(key)) keyIndex.set(key, counter++);
        const di = keyIndex.get(key)!;
        const t = getTime(i);
        (tmp[di] ||= []).push({ t, i });
    }

    const buckets: PackedSeries[] = Array.from({ length: counter }, () => ({
        times: new Float64Array(0),
        indices: new Uint32Array(0),
    }));
    for (const [k, arr] of Object.entries(tmp)) {
        arr.sort((a, b) => a.t - b.t);
        const m = arr.length;
        const times = new Float64Array(m);
        const indices = new Uint32Array(m);
        for (let j = 0; j < m; j++) {
            times[j] = arr[j].t;
            indices[j] = arr[j].i;
        }
        buckets[+k] = { times, indices };
    }

    return { keyIndex, buckets };
}


const getGrafanaFieldAccessor = (data: DataFrame, fieldName: string) => {
    const field = data.fields.find(f => f.name === fieldName);
    return field ? (index: number) => field.values[index] : undefined;
}


const getGeoJsonFieldAccessor = (data: Feature[], fieldName: string) => {
    return (index: number) => data[index].properties?.[fieldName];
}

const lengthAccessors = {
    grafana: (data: DataFrame) => data.length,
    geojson: (data: Feature[]) => data.length,
};

const fieldAccessors = {
    grafana: getGrafanaFieldAccessor,
    geojson: getGeoJsonFieldAccessor,
};
export type AccessorType = keyof typeof fieldAccessors;

// type AccessorFactory<T> = (data: T, fieldName: string) => ((i: number) => any) | undefined;

export const buildPacked = <T, S extends AccessorType = 'geojson'>(
    accessorType: S,
    data: T,
    keyFieldName?: string,
    timeFieldName?: string,
) => {
    const getAccessor = fieldAccessors[accessorType];
    const length = lengthAccessors[accessorType](data);
    const keyAccessor = getAccessor(data, keyFieldName);
    const timeAccessor = getAccessor(data, timeFieldName);
    return buildPackedFromAccessors(
        length,
        keyAccessor ? (i) => keyAccessor(i) : undefined,
        timeAccessor ? (i) => dateAsNumber(timeAccessor(i)) : undefined,
    );
}




/* ------------------------ Implementation Specifics ------------------------ */



// export function buildPacked(
//   features: Feature[],
//   idKey = 'deployment_id',
//   timeKey = 'time',
// ): { keyIndex: Map<string, number>; buckets: PackedSeries[] } {
//   if (!features?.length) return { keyIndex: new Map(), buckets: [] };

//   const keyIndex = new Map<string, number>();
//   let depCounter = 0;
//   for (const f of features) {
//     const id = String(f.properties?.[idKey] ?? f.id ?? '');
//     if (!keyIndex.has(id)) keyIndex.set(id, depCounter++);
//   }

//   const buckets: PackedSeries[] = Array.from({ length: depCounter }, () => ({
//     times: new Float64Array(0),
//     indices: new Uint32Array(0),
//   }));
//   const tmp: Record<number, Array<{ t: number; i: number }>> = {};

//   features.forEach((f, i) => {
//     const id = String(f.properties?.[idKey] ?? f.id ?? '');
//     const di = keyIndex.get(id)!;
//     const raw = f.properties?.[timeKey];
//     const t = raw instanceof Date ? raw.getTime() : Number(raw);
//     (tmp[di] ||= []).push({ t, i });
//     (f as GeoFeature).__idx = i;
//   });

//   for (const [k, arr] of Object.entries(tmp)) {
//     arr.sort((a, b) => a.t - b.t);
//     const n = arr.length;
//     const times = new Float64Array(n);
//     const indices = new Uint32Array(n);
//     for (let j = 0; j < n; j++) {
//       times[j] = arr[j].t;
//       indices[j] = arr[j].i;
//     }
//     buckets[+k] = { times, indices };
//   }

//   return { keyIndex, buckets };
// }

function asofIndex(times: Float64Array, t0: number): number {
  let lo = 0,
    hi = times.length - 1,
    ans = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >>> 1;
    if (times[mid] <= t0) {
      ans = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return ans;
}

const DEFAULT_MAX_LAG_MS = 60 * 60 * 1000;

export function computeClosestFlags(
  buckets: PackedSeries[],
  t0: number,
  maxLag = DEFAULT_MAX_LAG_MS,
): Uint8Array {
  const totalPoints = buckets.reduce((s, b) => s + b.indices.length, 0);
  const flags = new Uint8Array(totalPoints);

  for (const { times, indices } of buckets) {
    const j = asofIndex(times, t0);
    if (j >= 0 && t0 - times[j] <= maxLag) {
      flags[indices[j]] = 1;
    }
  }

  return flags;
}

export function resolveAsofLookup(
  features: Feature[],
  packed: { keyIndex: Map<string, number>; buckets: PackedSeries[] },
  fields: Array<{ sourceField: string }>,
  t0: number,
  maxLag = DEFAULT_MAX_LAG_MS,
): Map<string, Record<string, number>> {
  const { keyIndex, buckets } = packed;
  const result = new Map<string, Record<string, number>>();

  for (const [groupKey, idx] of keyIndex.entries()) {
    const bucket = buckets[idx];
    const j = asofIndex(bucket.times, t0);
    if (j < 0 || t0 - bucket.times[j] > maxLag) continue;

    const props = features[bucket.indices[j]].properties ?? {};
    const record: Record<string, number> = {};
    for (const { sourceField } of fields) {
      record[sourceField] = Number(props[sourceField] ?? 0);
    }
    result.set(groupKey, record);
  }

  return result;
}

export function useCurrentTimeFilter(
  features?: Feature[],
  currentTime?: Date,
  maxLag = DEFAULT_MAX_LAG_MS,
  idKey = 'deployment_id',
  timeKey = 'time',
): Uint8Array {
  const { buckets } = useMemo(
    () => (features ? buildPacked(features, idKey, timeKey) : { buckets: [] }),
    [features, idKey, timeKey],
  );

  const t = currentTime?.getTime();
  const n = features?.length || 0;

  return useMemo(() => {
    const t0 = t ?? Number.NEGATIVE_INFINITY;
    return Number.isFinite(t0) && buckets.length
      ? computeClosestFlags(buckets, t0, maxLag)
      : new Uint8Array(n);
  }, [buckets, t, n, maxLag]);
}
