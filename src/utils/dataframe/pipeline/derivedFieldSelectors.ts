import type { LayerConfig } from '../../../layers';
import { compileExpression, resolvePath } from '../derivedFields/expressionEngine';
import { getRowProperties, getRowValue, type LayerTable } from '../layerTable';

export type DerivedFieldSet = ReturnType<typeof compileDerivedFields>;
export type DerivedValueRow = Record<string, unknown>;
export type DerivedValueTable = DerivedValueRow[] | undefined;

export function compileDerivedFields(config: LayerConfig) {
  if (!config.derivedFields?.length) {
    return [];
  }

  return config.derivedFields.flatMap((derivedField) => {
    try {
      return [{ as: derivedField.as, evaluate: compileExpression(derivedField.expression) }];
    } catch (error) {
      console.warn(`[timeseriesmap] Failed to compile derived field "${derivedField.as}":`, error);
      return [];
    }
  });
}

function resolveDerivedFieldIdentifier({
  path,
  table,
  index,
  config,
  fieldSourceMap,
  joinedSourceValues,
  derivedRow,
  _cycleGuard = new Set<string>(),
}: {
  path: string[];
  table: LayerTable;
  index: number;
  config: LayerConfig;
  fieldSourceMap: Map<string, string>;
  joinedSourceValues?: Map<string, Map<string, Record<string, unknown>>>;
  derivedRow: DerivedValueRow;
  _cycleGuard?: Set<string>;
}) {
  const [head, ...rest] = path;
  if (!head) {
    return undefined;
  }

  if (head === 'index') {
    return rest.length === 0 ? index : undefined;
  }

  if (head === 'layer') {
    return resolvePath(config, rest);
  }

  if (head === 'this' || head === 'main') {
    if (rest.length === 0) {
      return getRowProperties(table, index);
    }
    const [field, ...tail] = rest;
    return resolvePath(getRowValue(table, index, field), tail);
  }

  if (head === 'derived') {
    return resolvePath(derivedRow, rest);
  }

  if (joinedSourceValues?.has(head)) {
    const [field, ...tail] = rest;
    if (!field) {
      return undefined;
    }
    const joinedSource = config.data.joinedSources?.find((s) => s.id === head);
    if (!joinedSource) {
      return undefined;
    }
    if (_cycleGuard.has(`${head}.${field}`)) {
      return undefined;
    }
    _cycleGuard.add(`${head}.${field}`);
    const key: any = resolveDerivedFieldIdentifier({
      path: [joinedSource.join.localKey.source, joinedSource.join.localKey.field],
      table,
      index,
      config,
      fieldSourceMap,
      joinedSourceValues,
      derivedRow,
      _cycleGuard,
    });
    const joinedValue = joinedSourceValues.get(head)?.get(String(key ?? ''))?.[field];
    return resolvePath(joinedValue, tail);
  }

  const source = fieldSourceMap.get(head);
  if (source === 'derived') {
    return resolvePath(derivedRow[head], rest);
  }
  if (source === config.data.featureSource.id) {
    return resolvePath(getRowValue(table, index, head), rest);
  }

  return undefined;
}

export function buildFieldSourceMap(config: LayerConfig, table: LayerTable): Map<string, string> {
  const map = new Map<string, string>();

  if (table.legacyFeatures) {
    for (const feature of table.legacyFeatures) {
      for (const fieldName of Object.keys(feature.properties ?? {})) {
        map.set(fieldName, config.data.featureSource.id);
      }
    }
  } else {
    for (const frame of table.frames) {
      for (const field of frame.fields) {
        map.set(field.name, config.data.featureSource.id);
      }
    }
  }

  for (const derivedField of config.derivedFields ?? []) {
    map.set(derivedField.as, 'derived');
  }
  return map;
}

export function selectDerivedValues(
  compiledDerivedFields: DerivedFieldSet,
  config: LayerConfig,
  table: LayerTable,
  joinedSourceValues?: Map<string, Map<string, Record<string, unknown>>>,
): DerivedValueTable {
  if (!compiledDerivedFields?.length) {
    return undefined;
  }

  const fieldSourceMap = buildFieldSourceMap(config, table);

  return table.data.map((_, index) => {
    const derivedRow: DerivedValueRow = {};

    for (const derivedField of compiledDerivedFields) {
      try {
        const resolver = (path: string[]) =>
          resolveDerivedFieldIdentifier({
            path,
            table,
            index,
            config,
            fieldSourceMap,
            joinedSourceValues,
            derivedRow,
          });
        derivedRow[derivedField.as] = derivedField.evaluate(resolver);
      } catch (error) {
        console.warn(`[timeseriesmap] Error evaluating derived field "${derivedField.as}":`, error);
      }
    }

    return derivedRow;
  });
}
