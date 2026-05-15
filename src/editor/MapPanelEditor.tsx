import React, { useState, useCallback, useMemo } from 'react';
import { css } from '@emotion/css';
import { useStyles2 } from '@grafana/ui';
import type { GrafanaTheme2, DataFrame, StandardEditorProps } from '@grafana/data';
import { layerDefinitions, type LayerConfig } from '../layers/_all';
import { LayerEditor } from './LayerEditor';
import { SelectableListEditor } from './SelectableListEditor';

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

export function MapPanelEditor({ value: layers, onChange, context }: Props) {
  const styles = useStyles2(getStyles);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const layerList = useMemo(() => layers ?? [], [layers]);
  const fieldIndex = useMemo(() => buildFieldIndex(context?.data ?? []), [context?.data]);
  const queryFieldsByRefId = useMemo(() => Object.fromEntries(fieldIndex.fieldsByRefId), [fieldIndex.fieldsByRefId]);
  const selectedLayer = selectedIndex !== null ? layerList[selectedIndex] : undefined;
  const availableFields = !selectedLayer?.queryRefId
    ? fieldIndex.firstFrameFields
    : fieldIndex.fieldsByRefId.get(selectedLayer.queryRefId) ?? [];

  const addLayer = useCallback(() => {
    const firstType = layerDefinitions[0]?.type ?? 'scatterplot';
    const newLayer = makeDefaultLayer(firstType, layerList.length);
    const next = [...layerList, newLayer];
    onChange(next);
    setSelectedIndex(next.length - 1);
  }, [layerList, onChange]);

  const removeLayer = useCallback(
    (i: number) => {
      const next = layerList.filter((_, idx) => idx !== i);
      onChange(next);
      setSelectedIndex(null);
    },
    [layerList, onChange],
  );

  const moveLayer = useCallback(
    (i: number, dir: -1 | 1) => {
      const j = i + dir;
      if (j < 0 || j >= layerList.length) {
        return;
      }

      const next = [...layerList];
      [next[i], next[j]] = [next[j], next[i]];
      onChange(next);
      setSelectedIndex(j);
    },
    [layerList, onChange],
  );

  const updateLayer = useCallback(
    (i: number, layer: LayerConfig) => {
      const next = [...layerList];
      next[i] = layer;
      onChange(next);
    },
    [layerList, onChange],
  );

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
