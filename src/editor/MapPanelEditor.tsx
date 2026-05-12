import React, { useState, useCallback, useMemo } from 'react';
import { css } from '@emotion/css';
import { useStyles2, Button, IconButton } from '@grafana/ui';
import type { GrafanaTheme2, DataFrame, StandardEditorProps } from '@grafana/data';
import type { LayerConfig } from '../types';
import { LayerEditor } from './LayerEditor';
import { getAllLayerTypes } from '../layers/registry';
import '../layers/_all'; // ensure registry is populated

function makeDefaultLayer(type: string, index: number): LayerConfig {
  const renderer = getAllLayerTypes().find((r) => r.type === type);
  return {
    id: `layer-${Date.now()}-${index}`,
    type,
    label: renderer ? `${renderer.label} ${index + 1}` : `Layer ${index + 1}`,
    visible: true,
    queryRefId: undefined,
    geometry: { type: 'wkb', field: 'geom' },
    timeFilter: { mode: 'none', timeField: 'time' },
    fieldMappings: [],
    opacity: 1,
    options: renderer ? { ...renderer.defaultOptions } : {},
  };
}

interface Props extends StandardEditorProps<LayerConfig[]> {}

function getFieldsForRefId(series: DataFrame[], refId: string | undefined): string[] {
  const frames = refId ? series.filter((f) => f.refId === refId) : series.slice(0, 1);
  const fieldSet = new Set<string>();
  for (const frame of frames) {
    for (const field of frame.fields) {
      fieldSet.add(field.name);
    }
  }
  return Array.from(fieldSet);
}

export function MapPanelEditor({ value: layers, onChange, context }: Props) {
  const styles = useStyles2(getStyles);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const layerList = useMemo(() => layers ?? [], [layers]);

  const addLayer = useCallback(() => {
    const firstType = getAllLayerTypes()[0]?.type ?? 'scatterplot';
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
      {/* Layer list */}
      <div className={styles.list}>
        {layerList.map((layer, i) => (
          <div
            key={layer.id}
            className={`${styles.listItem} ${selectedIndex === i ? styles.listItemActive : ''}`}
            onClick={() => setSelectedIndex(selectedIndex === i ? null : i)}
          >
            <IconButton
              name={layer.visible ? 'eye' : 'eye-slash'}
              size="sm"
              tooltip={layer.visible ? 'Hide layer' : 'Show layer'}
              className={styles.visButton}
              onClick={(e) => {
                e.stopPropagation();
                toggleLayerVisibility(i);
              }}
            />
            <span className={styles.layerName}>{layer.label || layer.type}</span>
            <div className={styles.listActions}>
              <IconButton
                name="arrow-up"
                size="sm"
                tooltip="Move up"
                onClick={(e) => { e.stopPropagation(); moveLayer(i, -1); }}
              />
              <IconButton
                name="arrow-down"
                size="sm"
                tooltip="Move down"
                onClick={(e) => { e.stopPropagation(); moveLayer(i, 1); }}
              />
              <IconButton
                name="trash-alt"
                size="sm"
                tooltip="Remove"
                onClick={(e) => { e.stopPropagation(); removeLayer(i); }}
              />
            </div>
          </div>
        ))}
        <Button variant="secondary" size="sm" icon="plus" onClick={addLayer}>
          Add layer
        </Button>
      </div>

      {/* Selected layer editor */}
      {selectedIndex !== null && layerList[selectedIndex] && (
        <div className={styles.editor}>
          <LayerEditor
            layer={layerList[selectedIndex]}
            onChange={(updated) => updateLayer(selectedIndex, updated)}
            availableFields={getFieldsForRefId(context?.data ?? [], layerList[selectedIndex].queryRefId)}
          />
        </div>
      )}
    </div>
  );
}

function getStyles(theme: GrafanaTheme2) {
  return {
    root: css({ display: 'flex', flexDirection: 'column', gap: theme.spacing(1) }),
    list: css({ display: 'flex', flexDirection: 'column', gap: 2 }),
    listItem: css({
      display: 'flex',
      alignItems: 'center',
      padding: `${theme.spacing(0.5)} ${theme.spacing(1)}`,
      borderRadius: theme.shape.radius.default,
      cursor: 'pointer',
      background: theme.colors.background.secondary,
      '&:hover': { background: theme.colors.action.hover },
    }),
    listItemActive: css({
      background: theme.colors.action.selected,
    }),
    visButton: css({ marginRight: theme.spacing(0.5), color: theme.colors.text.secondary }),
    layerName: css({ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }),
    listActions: css({ display: 'flex', gap: 2, marginLeft: theme.spacing(0.5) }),
    editor: css({
      border: `1px solid ${theme.colors.border.weak}`,
      borderRadius: theme.shape.radius.default,
      background: theme.colors.background.secondary,
    }),
  };
}
