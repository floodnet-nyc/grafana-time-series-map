import React from 'react';
import { css, cx } from '@emotion/css';
import { useStyles2, Button, IconButton, Combobox } from '@grafana/ui';
import type { GrafanaTheme2 } from '@grafana/data';

interface Props<T> {
  items: T[];
  selectedIndex: number | null;
  onSelect: (index: number | null) => void;
  getItemKey: (item: T, index: number) => string;
  getItemLabel: (item: T, index: number) => string;
  addButtonLabel: string;
  onAdd: (type?: string) => void;
  renderEditor: (item: T, index: number) => React.ReactNode;
  onMove?: (index: number, direction: -1 | 1) => void;
  onRemove?: (index: number) => void;
  onToggleVisibility?: (index: number) => void;
  isVisible?: (item: T, index: number) => boolean;
  getVisibilityTooltip?: (item: T, index: number) => string;
  addOptions?: Array<{ label: string; value: string; description?: string }>;
  maxLength?: number;
}

export function SelectableListEditor<T>({
  items,
  selectedIndex,
  onSelect,
  getItemKey,
  getItemLabel,
  addButtonLabel,
  onAdd,
  renderEditor,
  onMove,
  onRemove,
  onToggleVisibility,
  isVisible,
  getVisibilityTooltip,
  addOptions,
  maxLength,
}: Props<T>) {
  const styles = useStyles2(getStyles);
  const selectedItem = selectedIndex !== null ? items[selectedIndex] : undefined;

  return (
    <div className={styles.root}>
      <div className={styles.list}>
        {items.map((item, index) => {
          const selected = selectedIndex === index;
          const visible = isVisible?.(item, index);

          return (
            <div
              key={getItemKey(item, index)}
              className={cx(styles.listItem, selected && styles.listItemActive)}
              onClick={() => onSelect(selected ? null : index)}
            >
              {onToggleVisibility && visible !== undefined && (
                <IconButton
                  name={visible ? 'eye' : 'eye-slash'}
                  size="sm"
                  tooltip={getVisibilityTooltip?.(item, index) ?? (visible ? 'Hide item' : 'Show item')}
                  className={styles.visibilityButton}
                  onClick={(event) => {
                    event.stopPropagation();
                    onToggleVisibility(index);
                  }}
                />
              )}
              <span className={styles.itemLabel}>{getItemLabel(item, index)}</span>
              <div className={styles.listActions}>
                {onMove && (
                  <>
                    <IconButton
                      name="arrow-up"
                      size="sm"
                      tooltip="Move up"
                      onClick={(event) => {
                        event.stopPropagation();
                        onMove(index, -1);
                      }}
                    />
                    <IconButton
                      name="arrow-down"
                      size="sm"
                      tooltip="Move down"
                      onClick={(event) => {
                        event.stopPropagation();
                        onMove(index, 1);
                      }}
                    />
                  </>
                )}
                {onRemove && (
                  <IconButton
                    name="trash-alt"
                    size="sm"
                    tooltip="Remove"
                    onClick={(event) => {
                      event.stopPropagation();
                      onRemove(index);
                    }}
                  />
                )}
              </div>
            </div>
          );
        })}
        {maxLength !== undefined && items.length >= maxLength ? null : 
        addOptions ? (
          <Combobox
            options={addOptions}
            onChange={(option) => option?.value && onAdd(option.value)}
            placeholder={addButtonLabel}
          />
        ) : (
          <Button variant="secondary" size="sm" icon="plus" onClick={() => onAdd()}>
            {addButtonLabel}
          </Button>
        )}
      </div>

      {selectedItem !== undefined && selectedIndex !== null && <div className={styles.editor}>{renderEditor(selectedItem, selectedIndex)}</div>}
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
    visibilityButton: css({ marginRight: theme.spacing(0.5), color: theme.colors.text.secondary }),
    itemLabel: css({ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }),
    listActions: css({ display: 'flex', gap: 2, marginLeft: theme.spacing(0.5) }),
    editor: css({
      border: `1px solid ${theme.colors.border.weak}`,
      borderRadius: theme.shape.radius.default,
      background: theme.colors.background.secondary,
    }),
  };
}
