import React from 'react';
import { css } from '@emotion/css';
import { useStyles2, Input, Button, Icon } from '@grafana/ui';
import type { GrafanaTheme2 } from '@grafana/data';
import type { FieldMapping } from '../types';

interface Props {
  mappings: FieldMapping[];
  onChange: (mappings: FieldMapping[]) => void;
}

export function FieldMappingEditor({ mappings, onChange }: Props) {
  const styles = useStyles2(getStyles);

  const update = (i: number, patch: Partial<FieldMapping>) => {
    const next = [...mappings];
    next[i] = { ...next[i], ...patch };
    onChange(next);
  };

  const remove = (i: number) => onChange(mappings.filter((_, idx) => idx !== i));

  const add = () => onChange([...mappings, { fieldName: '', alias: '' }]);

  return (
    <div className={styles.container}>
      {mappings.map((m, i) => (
        <div key={i} className={styles.row}>
          <Input
            placeholder="DataFrame field name"
            value={m.fieldName}
            onChange={(e) => update(i, { fieldName: e.currentTarget.value })}
          />
          <span className={styles.arrow}>→</span>
          <Input
            placeholder="alias (e.g. value, time)"
            value={m.alias}
            onChange={(e) => update(i, { alias: e.currentTarget.value })}
          />
          <Button variant="secondary" size="sm" onClick={() => remove(i)}>
            <Icon name="trash-alt" />
          </Button>
        </div>
      ))}
      <Button variant="secondary" size="sm" icon="plus" onClick={add}>
        Add field mapping
      </Button>
    </div>
  );
}

function getStyles(theme: GrafanaTheme2) {
  return {
    container: css({ display: 'flex', flexDirection: 'column', gap: theme.spacing(0.5) }),
    row: css({ display: 'flex', alignItems: 'center', gap: theme.spacing(0.5) }),
    arrow: css({ color: theme.colors.text.secondary }),
  };
}
