import React, { useCallback, useMemo } from 'react';
import { css } from '@emotion/css';
import { useStyles2 } from '@grafana/ui';
import type { GrafanaTheme2, DataFrame, StandardEditorProps } from '@grafana/data';
import * as layerRegistry from '../layers';
import type { LayerConfig, LayerType } from '../layers';
import { DEFAULT_FEATURE_SOURCE_ID } from '../layers/defaults';
import { LayerEditor } from './LayerEditor';
import { SelectableListEditor } from './utils/SelectableListEditor';
import { useSelectableListState } from './utils/useSelectableListState';

function makeDefaultLayer(type: LayerType, index: number): LayerConfig {
  return (
    layerRegistry.createLayerConfig?.(type, index) ??
    layerRegistry.layerDefinitions.find((definition) => definition.type === type)?.createDefaultConfig(index) ??
    layerRegistry.layerDefinitions[0].createDefaultConfig(index)
  );
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

const getAvailableFieldsForRefId = (refId: string | undefined, fieldIndex: ReturnType<typeof buildFieldIndex>) => {
  if (!refId) {
    return fieldIndex.firstFrameFields;
  }
  return fieldIndex.fieldsByRefId.get(refId) ?? [];
};

function getSourceContext(layer: LayerConfig | undefined, fieldIndex: ReturnType<typeof buildFieldIndex>) {
  // console.log(fieldIndex)
  if (!layer) {
    return {
      sourceOptions: [] as Array<{ id: string; label: string }>,
      featureSourceOptions: [] as Array<{ id: string; label: string }>,
      fieldsBySource: {} as Record<string, string[]>,
      featureFieldsBySource: {} as Record<string, string[]>,
    };
  }

  const featureSource = layer.data.featureSource;
  const featureFields = [...getAvailableFieldsForRefId(featureSource.refId, fieldIndex)];
  for (const derivedField of layer.derivedFields ?? []) {
    if (derivedField.as && !featureFields.includes(derivedField.as)) {
      featureFields.push(derivedField.as);
    }
  }

  const fieldsBySource: Record<string, string[]> = {
    [featureSource.id]: featureFields,
  };

  for (const joinedSource of layer.data.joinedSources ?? []) {
    fieldsBySource[joinedSource.id] = joinedSource.fields.map((field) => field.as ?? field.field);
  }

  const sourceOptions = [
    {
      id: featureSource.id || DEFAULT_FEATURE_SOURCE_ID,
      label: featureSource.id === DEFAULT_FEATURE_SOURCE_ID ? 'Feature source' : featureSource.id,
    },
    ...(layer.data.joinedSources ?? []).map((source) => ({
      id: source.id,
      label: source.id,
    })),
  ];
  // console.log('sourceOptions', sourceOptions);
  // console.log(layer.data.joinedSources, fieldsBySource)

  return {
    sourceOptions,
    featureSourceOptions: sourceOptions.slice(0, 1),
    fieldsBySource,
    featureFieldsBySource: {
      [featureSource.id]: featureFields,
    },
  };
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

  const sourceContext = useMemo(() => getSourceContext(selectedLayer, fieldIndex), [selectedLayer, fieldIndex]);

  const addLayer = useCallback(() => {
    const firstType = layerRegistry.layerDefinitions[0]?.type ?? 'scatterplot';
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
    [layerList, updateLayer]
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
            availableRefIds={fieldIndex.refIds}
            queryFieldsByRefId={queryFieldsByRefId}
            sourceOptions={selectedIndex === index ? sourceContext.sourceOptions : []}
            fieldsBySource={selectedIndex === index ? sourceContext.fieldsBySource : {}}
            featureSourceOptions={selectedIndex === index ? sourceContext.featureSourceOptions : []}
            featureFieldsBySource={selectedIndex === index ? sourceContext.featureFieldsBySource : {}}
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
