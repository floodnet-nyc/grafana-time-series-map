import { Liquid } from 'liquidjs';
import type { Feature } from 'geojson';

export const liquid = new Liquid({ strictVariables: false, strictFilters: false });

const SPARKLINE_WIDTH = 220;
const SPARKLINE_HEIGHT = 44;
const SPARKLINE_PADDING_X = 4;
const SPARKLINE_PADDING_Y = 4;
const SPARKLINE_STROKE = '#7cc7ff';
const SPARKLINE_GUIDE = 'rgba(255,255,255,0.32)';
const SPARKLINE_AXIS = 'rgba(255,255,255,0.14)';

// ── Liquid filters for tooltip templates ──────────────────────────────────────

liquid.registerFilter('pretty', (value: unknown) => {
  if (value === null || value === undefined) return '—';

  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return String(value);
    return Number.isInteger(value) ? String(value) : Number(value.toFixed(4)).toString();
  }

  if (value instanceof Date) {
    return value.toLocaleString();
  }

  if (typeof value === 'string') {
    // try parsing as ISO date
    const d = new Date(value);
    if (!isNaN(d.getTime()) && /\d{4}-\d{2}-\d{2}/.test(value)) {
      return d.toLocaleString();
    }
    return value;
  }

  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }

  if (typeof value === 'object') {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }

  return String(value);
});

liquid.registerFilter('dateOnly', (value: unknown) => {
  if (value === null || value === undefined || value === '') {
    return '—';
  }

  const date =
    value instanceof Date ? value : typeof value === 'string' || typeof value === 'number' ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleDateString();
});

function toFiniteNumber(value: unknown): number | null {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }
  if (value instanceof Date) {
    return Number.isFinite(value.getTime()) ? value.getTime() : null;
  }
  if (typeof value === 'string') {
    const asNumber = Number(value);
    if (Number.isFinite(asNumber)) {
      return asNumber;
    }
    const asDate = new Date(value);
    return Number.isFinite(asDate.getTime()) ? asDate.getTime() : null;
  }
  return null;
}

function escapeAttribute(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

liquid.registerFilter(
  'sparkline',
  (
    rows: unknown,
    yField: string,
    xField?: string,
    from?: unknown,
    to?: unknown,
    current?: unknown
  ) => {
    if (!Array.isArray(rows) || !yField) {
      return '';
    }

    const points = rows
      .map((row) => {
        const item = row as Record<string, unknown>;
        const y = toFiniteNumber(item?.[yField]);
        const x = xField ? toFiniteNumber(item?.[xField]) : null;
        return y === null ? null : { x, y };
      })
      .filter((point): point is { x: number | null; y: number } => point !== null);

    if (points.length === 0) {
      return '';
    }

    const sorted = xField ? [...points].sort((a, b) => (a.x ?? 0) - (b.x ?? 0)) : points;
    const fallbackFrom = xField ? sorted.find((point) => point.x !== null)?.x ?? 0 : 0;
    const fallbackTo = xField ? [...sorted].reverse().find((point) => point.x !== null)?.x ?? 1 : sorted.length - 1;
    const domainFrom = toFiniteNumber(from) ?? fallbackFrom;
    const domainTo = toFiniteNumber(to) ?? fallbackTo;
    const currentTime = toFiniteNumber(current);
    const yMin = Math.min(...sorted.map((point) => point.y));
    const yMax = Math.max(...sorted.map((point) => point.y));
    const yRange = yMax - yMin || 1;
    const xRange = domainTo - domainFrom || 1;
    const innerWidth = SPARKLINE_WIDTH - SPARKLINE_PADDING_X * 2;
    const innerHeight = SPARKLINE_HEIGHT - SPARKLINE_PADDING_Y * 2;

    const path = sorted
      .map((point, index) => {
        const xValue = xField ? point.x ?? domainFrom : index;
        const x = SPARKLINE_PADDING_X + ((xValue - domainFrom) / xRange) * innerWidth;
        const y = SPARKLINE_PADDING_Y + innerHeight - ((point.y - yMin) / yRange) * innerHeight;
        return `${index === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
      })
      .join(' ');

    const guideX =
      currentTime === null
        ? null
        : SPARKLINE_PADDING_X + ((Math.max(domainFrom, Math.min(domainTo, currentTime)) - domainFrom) / xRange) * innerWidth;

    return `<svg viewBox="0 0 ${SPARKLINE_WIDTH} ${SPARKLINE_HEIGHT}" width="${SPARKLINE_WIDTH}" height="${SPARKLINE_HEIGHT}" role="img" aria-label="${escapeAttribute(
      `${yField} sparkline`
    )}" style="display:block;width:100%;height:${SPARKLINE_HEIGHT}px;overflow:visible"><line x1="${SPARKLINE_PADDING_X}" y1="${(
      SPARKLINE_HEIGHT - SPARKLINE_PADDING_Y
    ).toFixed(2)}" x2="${(SPARKLINE_WIDTH - SPARKLINE_PADDING_X).toFixed(2)}" y2="${(
      SPARKLINE_HEIGHT - SPARKLINE_PADDING_Y
    ).toFixed(2)}" stroke="${SPARKLINE_AXIS}" stroke-width="1" />${
      guideX === null
        ? ''
        : `<line x1="${guideX.toFixed(2)}" y1="${SPARKLINE_PADDING_Y}" x2="${guideX.toFixed(2)}" y2="${(
            SPARKLINE_HEIGHT - SPARKLINE_PADDING_Y
          ).toFixed(2)}" stroke="${SPARKLINE_GUIDE}" stroke-width="1" stroke-dasharray="2 3" />`
    }<path d="${path}" fill="none" stroke="${SPARKLINE_STROKE}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" /></svg>`;
  }
);

export function getFeatureFromDatum(datum: unknown): Feature | null {
  if (!datum || typeof datum !== 'object') {
    return null;
  }
  if ((datum as Feature).type === 'Feature') {
    return datum as Feature;
  }
  const candidate = (datum as { feature?: unknown }).feature;
  return candidate && typeof candidate === 'object' && (candidate as Feature).type === 'Feature'
    ? (candidate as Feature)
    : null;
}

export function buildLiquidScope(properties: Record<string, unknown>, selectedKey?: string) {
  const entries = Object.entries(properties).filter(([k]) => !k.startsWith('__'));
  return {
    _key: selectedKey ?? '',
    ...Object.fromEntries(entries),
    properties: entries.map(([key, value]) => ({ key, value })),
  };
}

export function renderLiquidTemplate(template: string, scope: Record<string, unknown>): string | null {
  try {
    return liquid.renderSync(liquid.parse(template), scope).trim() || null;
  } catch {
    return null;
  }
}
