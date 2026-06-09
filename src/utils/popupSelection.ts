import { FieldType } from '@grafana/data';
import type { Feature } from 'geojson';
import type { PreparedLayerState } from './dataframe/pipeline/preparedLayerSelectors';
import { buildFeatureScope } from './dataframe/featureScope';
import { buildFeatureAt, getRowValue, type LayerTable } from './dataframe/layerTable';

export type PopupMatch = {
  layerId: string;
  layerLabel: string;
  rowIndex: number;
  feature: Feature | null;
  properties: Record<string, unknown>;
  scope: Record<string, unknown>;
  time?: string | number | Date;
} & Record<string, unknown>;

export interface PopupSelectionContext {
  selectedKey: string;
  primary: PopupMatch | null;
  match: Record<string, PopupMatch | null>;
  matches: Record<string, PopupMatch[]>;
  flatMatches: PopupMatch[];
}

function getRowTimeValue(table: LayerTable, index: number): string | number | Date | undefined {
  const rowRef = table.rowRefs[index];
  const frame = rowRef ? table.frames[rowRef.frameIndex] : undefined;
  const timeField = frame?.fields.find((field) => field.type === FieldType.time);
  if (!timeField || rowRef === undefined) {
    return undefined;
  }
  return getRowValue(table, index, timeField.name) as string | number | Date | undefined;
}

function toTimeDistance(value: string | number | Date | undefined, cursorTimeMs: number): number | null {
  if (value instanceof Date) {
    return Math.abs(value.getTime() - cursorTimeMs);
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.abs(value - cursorTimeMs);
  }
  if (typeof value === 'string') {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return Math.abs(parsed.getTime() - cursorTimeMs);
    }
  }
  return null;
}

function chooseRepresentative(matches: PopupMatch[], cursorTimeMs: number): PopupMatch | null {
  if (matches.length === 0) {
    return null;
  }

  let best: PopupMatch | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (const candidate of matches) {
    const distance = toTimeDistance(candidate.time, cursorTimeMs);
    if (distance === null) {
      continue;
    }
    if (distance < bestDistance) {
      best = candidate;
      bestDistance = distance;
    }
  }

  return best ?? matches[0];
}

export function buildPopupSelectionContext(
  preparedLayerStates: PreparedLayerState[],
  selectedKey: string | null,
  cursorTimeMs: number
): PopupSelectionContext | null {
  if (!selectedKey) {
    return null;
  }

  const matches: Record<string, PopupMatch[]> = {};
  const match: Record<string, PopupMatch | null> = {};
  const flatMatches: PopupMatch[] = [];

  for (const preparedLayerState of preparedLayerStates) {
    const { config, table, joinedSourceValues, derivedValues } = preparedLayerState;
    matches[config.id] = [];
    match[config.id] = null;

    const keyField = config.selectionKey;
    if (!keyField?.field || keyField.source !== config.data.featureSource.id) {
      continue;
    }

    for (let index = 0; index < table.data.length; index += 1) {
      if (String(getRowValue(table, index, keyField.field) ?? '') !== selectedKey) {
        continue;
      }

      const feature = buildFeatureAt(table, index);
      const properties = { ...(feature.properties ?? {}) };
      const scope = buildFeatureScope({
        config,
        table,
        index,
        joinedSourceValues,
        derivedRow: derivedValues?.[index],
      });
      const popupMatch: PopupMatch = {
        layerId: config.id,
        layerLabel: config.label,
        rowIndex: index,
        feature,
        properties,
        scope,
        time: getRowTimeValue(table, index),
        ...scope,
      };
      matches[config.id].push(popupMatch);
      flatMatches.push(popupMatch);
    }

    match[config.id] = chooseRepresentative(matches[config.id], cursorTimeMs);
  }

  const primaryLayerState =
    preparedLayerStates.find((state) => state.config.visible && matches[state.config.id]?.length) ??
    preparedLayerStates.find((state) => matches[state.config.id]?.length);
  const primary = primaryLayerState ? match[primaryLayerState.config.id] : null;

  return {
    selectedKey,
    primary,
    match,
    matches,
    flatMatches,
  };
}
