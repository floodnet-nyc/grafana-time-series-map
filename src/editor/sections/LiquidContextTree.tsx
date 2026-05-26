import React, { useMemo, useState } from 'react';
import { css } from '@emotion/css';
import { useStyles2 } from '@grafana/ui';
import type { DataFrame, GrafanaTheme2 } from '@grafana/data';

interface Props {
  data?: DataFrame[];
}

export function LiquidContextTree({ data }: Props) {
  const styles = useStyles2(getStyles);
  const [open, setOpen] = useState(false);

  const dataFields = useMemo(() => {
    if (!data?.length) {
      return [];
    }
    const seen = new Set<string>();
    const result: Array<{ name: string; type: string }> = [];
    for (const frame of data) {
      for (const field of frame.fields) {
        if (!seen.has(field.name) && !field.name.startsWith('__')) {
          seen.add(field.name);
          result.push({ name: field.name, type: field.type });
        }
      }
    }
    return result;
  }, [data]);

  return (
    <div className={styles.root}>
      <button type="button" className={styles.toggle} onClick={() => setOpen((v) => !v)}>
        <span className={styles.chevron}>{open ? '▾' : '▸'}</span>
        Template variables
      </button>
      {open && (
        <table className={styles.table}>
          <tbody>
            <Row name="_key" type="string" desc="Selected feature key" styles={styles} />
            <Row name="properties" type="array" desc="All feature fields — use in a for-loop" styles={styles} />
            <Row
              name="p.key"
              type="string"
              desc="Field name (inside {% for p in properties %})"
              styles={styles}
              indent
            />
            <Row name="p.value" type="any" desc="Field value" styles={styles} indent />
            {dataFields.length > 0 && (
              <>
                <tr>
                  <td colSpan={3} className={styles.sectionLabel}>
                    Fields from your data
                  </td>
                </tr>
                {dataFields.map((f) => (
                  <Row key={f.name} name={f.name} type={f.type} styles={styles} />
                ))}
              </>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}

interface RowProps {
  name: string;
  type: string;
  desc?: string;
  indent?: boolean;
  styles: ReturnType<typeof getStyles>;
}

function Row({ name, type, desc, indent, styles }: RowProps) {
  return (
    <tr>
      <td className={styles.name} style={indent ? { paddingLeft: 20 } : undefined}>
        <code className={styles.code}>{`{{ ${name} }}`}</code>
      </td>
      <td className={styles.type}>{type}</td>
      <td className={styles.desc}>{desc ?? ''}</td>
    </tr>
  );
}

function getStyles(theme: GrafanaTheme2) {
  return {
    root: css({
      marginTop: theme.spacing(1),
    }),
    toggle: css({
      background: 'none',
      border: 'none',
      color: theme.colors.text.secondary,
      cursor: 'pointer',
      fontSize: theme.typography.bodySmall.fontSize,
      padding: `${theme.spacing(0.5)} 0`,
      display: 'flex',
      alignItems: 'center',
      gap: theme.spacing(0.5),
    }),
    chevron: css({
      fontSize: 10,
      lineHeight: 1,
      userSelect: 'none',
    }),
    table: css({
      width: '100%',
      borderCollapse: 'collapse',
      marginTop: theme.spacing(0.5),
      fontSize: theme.typography.bodySmall.fontSize,
    }),
    name: css({
      paddingRight: theme.spacing(1.5),
      paddingTop: theme.spacing(0.5),
      paddingBottom: theme.spacing(0.5),
      whiteSpace: 'nowrap',
      verticalAlign: 'top',
    }),
    code: css({
      background: theme.colors.background.secondary,
      borderRadius: theme.shape.radius.default,
      padding: `1px ${theme.spacing(0.5)}`,
      fontFamily: theme.typography.fontFamilyMonospace,
      fontSize: '0.85em',
      color: theme.colors.text.primary,
    }),
    type: css({
      paddingRight: theme.spacing(1.5),
      paddingTop: theme.spacing(0.5),
      paddingBottom: theme.spacing(0.5),
      color: theme.colors.text.secondary,
      whiteSpace: 'nowrap',
      verticalAlign: 'top',
    }),
    desc: css({
      paddingTop: theme.spacing(0.5),
      paddingBottom: theme.spacing(0.5),
      color: theme.colors.text.secondary,
      verticalAlign: 'top',
    }),
    sectionLabel: css({
      paddingTop: theme.spacing(1),
      paddingBottom: theme.spacing(0.25),
      color: theme.colors.text.disabled,
      fontSize: '0.8em',
      textTransform: 'uppercase',
      letterSpacing: '0.05em',
    }),
  };
}
