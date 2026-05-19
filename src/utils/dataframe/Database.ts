import { DataFrame, PanelData } from '@grafana/data';
import type { Feature } from 'geojson';
import { LayerConfig } from 'layers/_all';

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



// type AccessorFactory<T> = (data: T, fieldName: string) => ((i: number) => any) | undefined;

export const buildPacked = <T>(
    data: T,
    accessorType: keyof typeof fieldAccessors,
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



export const buildPackedQueries = <T>(accessorType: AccessorType, layerConfigs: LayerConfig[], data: T) => {
    const queries: Record<string, Record<string, Record<string, string[]>>> = {};
    for (const layerConfig of layerConfigs) {
        if (layerConfig.timeFilter.mode === 'asof') {
            const refId = layerConfig.queryRefId;
            const keyFieldName = layerConfig.selectionKeyField ?? '';
            const timeFieldName = layerConfig.timeFilter.timeField;
            if (refId && timeFieldName) {
                let { [keyFieldName]: { [timeFieldName]: arr=[] } = {} } = queries[refId] || {};
                arr.push(layerConfig.id);
                if (!queries[refId]) {
                    queries[refId] = { [keyFieldName]: { [timeFieldName]: arr } };
                } else {
                    queries[refId]![keyFieldName][timeFieldName] = arr;
                }
            }
        }
        for (const secondarySource of layerConfig.secondarySources ?? []) {
            if (secondarySource.join.type === 'keyed-asof') {
                const { queryRefId, join: { remoteKeyField: keyFieldName, timeField: timeFieldName } } = secondarySource;
                if (queryRefId && timeFieldName) {
                    let { [keyFieldName]: { [timeFieldName]: arr=[] } = {} } = queries[queryRefId] || {};
                    arr.push(layerConfig.id);
                    if (!queries[queryRefId]) {
                        queries[queryRefId] = { [keyFieldName]: { [timeFieldName]: arr } };
                    } else {
                        queries[queryRefId]![keyFieldName][timeFieldName] = arr;
                    }
                }
            }
        }
    }

    const packedByQueryId = new Map<string, Map<string, Map<string, PackedLookupEntry>>>();
    for (const [refId, fields] of Object.entries(queries)) {
        for (const [keyFieldName, timeFields] of Object.entries(fields)) {
            for (const [timeFieldName, layerIds] of Object.entries(timeFields)) {
                const { keyIndex, buckets } = buildPacked(
                    data,
                    accessorType,
                    keyFieldName,
                    timeFieldName,
                );
                for (const layerId of layerIds) {
                    if (!packedByQueryId.has(refId)) {
                        packedByQueryId.set(refId, new Map());
                    }
                    const byKeyField = packedByQueryId.get(refId)!;
                    if (!byKeyField.has(keyFieldName)) {
                        byKeyField.set(keyFieldName, new Map());
                    }
                    const byTimeField = byKeyField.get(keyFieldName)!;
                    byTimeField.set(timeFieldName, { keyIndex, buckets });
                }
            }
        }
    }

    const packedByLayerId = new Map<string, Map<string, PackedLookupEntry>>();
    return packedByLayerId;
}