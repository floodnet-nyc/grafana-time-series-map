import React, { useCallback, useMemo } from 'react';
import { css } from '@emotion/css';
import { useStyles2 } from '@grafana/ui';
import type { GrafanaTheme2, DataFrame, StandardEditorProps } from '@grafana/data';
import { layerDefinitions, type LayerConfig } from '../layers/_all';
import { LayerEditor } from './LayerEditor';
import { SelectableListEditor } from './SelectableListEditor';
import { useSelectableListState } from './useSelectableListState';

function makeDefaultLayer(type: string, index: number): LayerConfig {
  const renderer = layerDefinitions.find((definition) => definition.type === type);
  return renderer ? renderer.createDefaultConfig(index) : layerDefinitions[0].createDefaultConfig(index);
}

interface Props extends StandardEditorProps<LayerConfig[]> {}

function buildFieldIndex(series: DataFrame[]) {
  const refIds: string[] = [];
  const seenRefIds = new Set<string>();
  const fieldsByRefId = new Map<string, string[]>();
  let firstFrameFields: string[] = [];

  for (const [index, frame] of series.entries()) {
    const fieldNames = frame.fields.map((field) => field.name);
    if (index === 0) {
      firstFrameFields = fieldNames;
    }

    if (!frame.refId) {
      continue;
    }

    if (!seenRefIds.has(frame.refId)) {
      seenRefIds.add(frame.refId);
      refIds.push(frame.refId);
    }

    const existing = fieldsByRefId.get(frame.refId);
    if (!existing) {
      fieldsByRefId.set(frame.refId, Array.from(new Set(fieldNames)));
      continue;
    }

    const merged = new Set(existing);
    for (const fieldName of fieldNames) {
      merged.add(fieldName);
    }
    fieldsByRefId.set(frame.refId, Array.from(merged));
  }

  return { refIds, fieldsByRefId, firstFrameFields };
}


const getAvailableFieldsForQuery = (queryRefId: string | undefined, fieldIndex: ReturnType<typeof buildFieldIndex>) => {
  if (!queryRefId) {
    return fieldIndex.firstFrameFields;
  }
  return fieldIndex.fieldsByRefId.get(queryRefId) ?? [];
}

const getAvailableFieldsForLayer = (layer: LayerConfig | undefined, fieldIndex: ReturnType<typeof buildFieldIndex>) => {
  if (!layer) {
    return [];
  }
  let availableFields: string[] = [...getAvailableFieldsForQuery(layer.queryRefId, fieldIndex)];

  if (layer.secondarySources) {
    for (const secondarySource of layer.secondarySources) {
      availableFields.push(secondarySource.join.timeField);
      for (const secondaryField of secondarySource.fields) {
        if (!availableFields.includes(secondaryField.sourceField)) {
          availableFields.push(secondaryField.sourceField);
        }
      }
    }
  }
  if (layer.derivedFields) {
    for (const derivedField of layer.derivedFields) {
      if (!availableFields.includes(derivedField.as)) {
        availableFields.push(derivedField.as);
      }
    }
  }

  return availableFields;
}


export function MapPanelEditor({ value: layers, onChange, context }: Props) {
  const styles = useStyles2(getStyles);
  const layerList = useMemo(() => layers ?? [], [layers]);
  const {
    selectedIndex,
    setSelectedIndex,
    updateAt: updateLayer,
    addItem: addLayerItem,
    removeAt: removeLayer,
    moveAt: moveLayer,
  } = useSelectableListState({
    items: layerList,
    onChange,
    removeBehavior: 'clear',
  });
  const fieldIndex = useMemo(() => buildFieldIndex(context?.data ?? []), [context?.data]);
  const queryFieldsByRefId = useMemo(() => Object.fromEntries(fieldIndex.fieldsByRefId), [fieldIndex.fieldsByRefId]);
  const selectedLayer = selectedIndex !== null ? layerList[selectedIndex] : undefined;

  const availableFields = useMemo(() => {
    return getAvailableFieldsForLayer(selectedLayer, fieldIndex);
  }, [selectedLayer, fieldIndex]);

  const addLayer = useCallback(() => {
    const firstType = layerDefinitions[0]?.type ?? 'scatterplot';
    addLayerItem(makeDefaultLayer(firstType, layerList.length));
  }, [addLayerItem, layerList.length]);

  const toggleLayerVisibility = useCallback(
    (i: number) => {
      const layer = layerList[i];
      if (!layer) {
        return;
      }

      updateLayer(i, { ...layer, visible: !layer.visible });
    },
    [layerList, updateLayer],
  );

  return (
    <div className={styles.root}>
      <SelectableListEditor
        items={layerList}
        selectedIndex={selectedIndex}
        onSelect={setSelectedIndex}
        getItemKey={(layer) => layer.id}
        getItemLabel={(layer) => layer.label || layer.type}
        addButtonLabel="Add layer"
        onAdd={addLayer}
        onMove={moveLayer}
        onRemove={removeLayer}
        onToggleVisibility={toggleLayerVisibility}
        isVisible={(layer) => layer.visible}
        getVisibilityTooltip={(layer) => (layer.visible ? 'Hide layer' : 'Show layer')}
        renderEditor={(layer, index) => (
          <LayerEditor
            layer={layer}
            onChange={(updated) => updateLayer(index, updated)}
            availableFields={selectedIndex === index ? availableFields : []}
            availableRefIds={fieldIndex.refIds}
            queryFieldsByRefId={queryFieldsByRefId}
          />
        )}
      />
    </div>
  );
}

function getStyles(theme: GrafanaTheme2) {
  return {
    root: css({ display: 'flex', flexDirection: 'column', gap: theme.spacing(1) }),
  };
}
