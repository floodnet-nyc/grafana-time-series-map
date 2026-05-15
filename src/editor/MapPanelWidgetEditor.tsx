import React, { useState, useCallback, useMemo } from 'react';
import { css } from '@emotion/css';
import { useStyles2 } from '@grafana/ui';
import type { GrafanaTheme2, StandardEditorProps } from '@grafana/data';
import type { WidgetConfig } from '../widgets/types';
import { widgetDefinitions } from '../widgets/_all';
import { WidgetEditor } from './WidgetEditor';
import { SelectableListEditor } from './SelectableListEditor';

interface Props extends StandardEditorProps<WidgetConfig[]> {}

export function MapPanelWidgetEditor({ value: widgets, onChange }: Props) {
  const styles = useStyles2(getStyles);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const widgetList = useMemo(() => widgets ?? [], [widgets]);

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
      <SelectableListEditor
        items={widgetList}
        selectedIndex={selectedIndex}
        onSelect={setSelectedIndex}
        getItemKey={(widget) => widget.id}
        getItemLabel={(widget) => widget.label || widget.type}
        addButtonLabel="Add widget"
        onAdd={addWidget}
        onMove={moveWidget}
        onRemove={removeWidget}
        onToggleVisibility={toggleVisibility}
        isVisible={(widget) => widget.visible}
        getVisibilityTooltip={(widget) => (widget.visible ? 'Hide widget' : 'Show widget')}
        renderEditor={(widget, index) => <WidgetEditor widget={widget} onChange={(updated) => updateWidget(index, updated)} />}
      />
    </div>
  );
}

function getStyles(theme: GrafanaTheme2) {
  return {
    root: css({ display: 'flex', flexDirection: 'column', gap: theme.spacing(1) }),
  };
}
