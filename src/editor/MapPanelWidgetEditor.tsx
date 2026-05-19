import React, { useCallback, useMemo } from 'react';
import { css } from '@emotion/css';
import { useStyles2 } from '@grafana/ui';
import type { GrafanaTheme2, StandardEditorProps } from '@grafana/data';
import { widgetDefinitions, type WidgetConfig } from '../widgets/_all';
import { WidgetEditor } from './WidgetEditor';
import { SelectableListEditor } from './SelectableListEditor';
import { useSelectableListState } from './useSelectableListState';

interface Props extends StandardEditorProps<WidgetConfig[]> {}

export function MapPanelWidgetEditor({ value: widgets, onChange }: Props) {
  const styles = useStyles2(getStyles);
  const widgetList = useMemo(() => widgets ?? [], [widgets]);
  const {
    selectedIndex,
    setSelectedIndex,
    updateAt: updateWidget,
    addItem: addWidgetItem,
    removeAt: removeWidget,
    moveAt: moveWidget,
  } = useSelectableListState({
    items: widgetList,
    onChange,
    removeBehavior: 'clear',
  });

  const addWidget = useCallback((type = '') => {
    addWidgetItem({
      id: `widget-${widgetList.length + 1}`,
      type,
      label: '',
      visible: true,
      settings: {},
    } as WidgetConfig);
  }, [addWidgetItem, widgetList.length]);

  const toggleVisibility = useCallback(
    (i: number) => {
      const w = widgetList[i];
      if (w) {
        updateWidget(i, { ...w, visible: !w.visible });
      }
    },
    [widgetList, updateWidget],
  );

  const widgetTypes = useMemo(
    () => widgetDefinitions.map((d) => ({ label: d.label, value: d.type, description: d.description })),
    []
  );

  return (
    <div className={styles.root}>
      <SelectableListEditor
        items={widgetList}
        selectedIndex={selectedIndex}
        onSelect={setSelectedIndex}
        getItemKey={(widget) => widget.id}
        getItemLabel={(widget) => widgetDefinitions.find((definition) => definition.type === widget.type)?.label ?? (widget.label || 'Select widget type')}
        addButtonLabel="Add widget"
        addOptions={widgetTypes}
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
