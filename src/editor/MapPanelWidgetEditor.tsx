import React, { useState, useCallback, useMemo } from 'react';
import { css } from '@emotion/css';
import { useStyles2, Button, IconButton } from '@grafana/ui';
import type { GrafanaTheme2, StandardEditorProps } from '@grafana/data';
import type { WidgetConfig } from '../widgets/types';
import { widgetDefinitions } from '../widgets/_all';
import { WidgetEditor } from './WidgetEditor';

interface Props extends StandardEditorProps<WidgetConfig[]> {}

export function MapPanelWidgetEditor({ value: widgets, onChange }: Props) {
  const styles = useStyles2(getStyles);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const widgetList = useMemo(() => widgets ?? [], [widgets]);
  const selectedWidget = selectedIndex !== null ? widgetList[selectedIndex] : undefined;

  const addWidget = useCallback(() => {
    const firstDef = widgetDefinitions[0];
    if (!firstDef) {
      return;
    }
    const next = [...widgetList, firstDef.createDefaultConfig(widgetList.length)];
    onChange(next);
    setSelectedIndex(next.length - 1);
  }, [widgetList, onChange]);

  const removeWidget = useCallback(
    (i: number) => {
      onChange(widgetList.filter((_, idx) => idx !== i));
      setSelectedIndex(null);
    },
    [widgetList, onChange],
  );

  const moveWidget = useCallback(
    (i: number, dir: -1 | 1) => {
      const j = i + dir;
      if (j < 0 || j >= widgetList.length) {
        return;
      }
      const next = [...widgetList];
      [next[i], next[j]] = [next[j], next[i]];
      onChange(next);
      setSelectedIndex(j);
    },
    [widgetList, onChange],
  );

  const updateWidget = useCallback(
    (i: number, widget: WidgetConfig) => {
      const next = [...widgetList];
      next[i] = widget;
      onChange(next);
    },
    [widgetList, onChange],
  );

  const toggleVisibility = useCallback(
    (i: number) => {
      const w = widgetList[i];
      if (w) {
        updateWidget(i, { ...w, visible: !w.visible });
      }
    },
    [widgetList, updateWidget],
  );

  return (
    <div className={styles.root}>
      <div className={styles.list}>
        {widgetList.map((widget, i) => (
          <div
            key={widget.id}
            className={`${styles.listItem} ${selectedIndex === i ? styles.listItemActive : ''}`}
            onClick={() => setSelectedIndex(selectedIndex === i ? null : i)}
          >
            <IconButton
              name={widget.visible ? 'eye' : 'eye-slash'}
              size="sm"
              tooltip={widget.visible ? 'Hide widget' : 'Show widget'}
              className={styles.visButton}
              onClick={(e) => { e.stopPropagation(); toggleVisibility(i); }}
            />
            <span className={styles.widgetName}>{widget.label || widget.type}</span>
            <div className={styles.listActions}>
              <IconButton name="arrow-up" size="sm" tooltip="Move up" onClick={(e) => { e.stopPropagation(); moveWidget(i, -1); }} />
              <IconButton name="arrow-down" size="sm" tooltip="Move down" onClick={(e) => { e.stopPropagation(); moveWidget(i, 1); }} />
              <IconButton name="trash-alt" size="sm" tooltip="Remove" onClick={(e) => { e.stopPropagation(); removeWidget(i); }} />
            </div>
          </div>
        ))}
        <Button variant="secondary" size="sm" icon="plus" onClick={addWidget}>
          Add widget
        </Button>
      </div>

      {selectedWidget && (
        <div className={styles.editor}>
          <WidgetEditor
            widget={selectedWidget}
            onChange={(updated) => updateWidget(selectedIndex!, updated)}
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
    listItemActive: css({ background: theme.colors.action.selected }),
    visButton: css({ marginRight: theme.spacing(0.5), color: theme.colors.text.secondary }),
    widgetName: css({ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }),
    listActions: css({ display: 'flex', gap: 2, marginLeft: theme.spacing(0.5) }),
    editor: css({
      border: `1px solid ${theme.colors.border.weak}`,
      borderRadius: theme.shape.radius.default,
      background: theme.colors.background.secondary,
    }),
  };
}
