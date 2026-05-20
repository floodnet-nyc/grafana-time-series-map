import type { LayerConfig } from '../../../layers';
import { compileExpression } from '../derivedFields/expressionEngine';
import { buildFeatureScope } from '../featureScope';
import type { LayerTable } from '../layerTable';

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

export function selectDerivedValues(
  compiledDerivedFields: DerivedFieldSet,
  config: LayerConfig,
  table: LayerTable,
  joinedSourceValues?: Map<string, Map<string, Record<string, unknown>>>,
): DerivedValueTable {
  if (!compiledDerivedFields?.length) {
    return undefined;
  }

  return table.data.map((_, index) => {
    const derivedRow: DerivedValueRow = {};

    for (const derivedField of compiledDerivedFields) {
      try {
        const scope = buildFeatureScope({
          config,
          table,
          index,
          joinedSourceValues,
          derivedRow,
        });
        derivedRow[derivedField.as] = derivedField.evaluate({
          ...scope,
          derived: derivedRow,
          index,
        });
      } catch (error) {
        console.warn(`[timeseriesmap] Error evaluating derived field "${derivedField.as}":`, error);
      }
    }

    return derivedRow;
  });
}
