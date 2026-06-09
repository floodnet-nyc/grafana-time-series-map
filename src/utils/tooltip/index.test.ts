import { buildDeckTooltip, DEFAULT_TOOLTIP_TEMPLATE } from './index';
import type { LayerTable } from '../dataframe/layerTable';

function createFeature(properties: Record<string, unknown>) {
  return {
    type: 'Feature' as const,
    geometry: { type: 'Point' as const, coordinates: [0, 0] as [number, number] },
    properties,
  };
}

describe('tooltip', () => {
  it('returns null when there is no object', () => {
    const getTooltip = buildDeckTooltip(DEFAULT_TOOLTIP_TEMPLATE);
    expect(getTooltip({ object: null } as any)).toBeNull();
  });

  it('returns null when the feature has no properties', () => {
    const getTooltip = buildDeckTooltip(DEFAULT_TOOLTIP_TEMPLATE);
    const feature = { type: 'Feature', geometry: null, properties: null } as any;
    expect(getTooltip({ object: feature } as any)).toBeNull();
  });

  it('renders a row for each feature property using the default template', () => {
    const getTooltip = buildDeckTooltip(DEFAULT_TOOLTIP_TEMPLATE);
    const feature = createFeature({ sensor_id: 'abc', depth_in: 3.5 });
    const result = getTooltip({ object: feature } as any) as any;
    expect(result).not.toBeNull();
    expect(result.html).toContain('sensor_id');
    expect(result.html).toContain('abc');
    expect(result.html).toContain('depth_in');
    expect(result.html).toContain('3.5');
  });

  it('omits internal __idx properties', () => {
    const getTooltip = buildDeckTooltip(DEFAULT_TOOLTIP_TEMPLATE);
    const feature = createFeature({ __idx: 0, name: 'sensor' });
    const result = getTooltip({ object: feature } as any) as any;
    expect(result.html).not.toContain('__idx');
    expect(result.html).toContain('name');
  });

  it('supports direct variable access in a custom template', () => {
    const getTooltip = buildDeckTooltip('<b>{{ sensor_id }}</b>');
    const feature = createFeature({ sensor_id: 'xyz-99' });
    const result = getTooltip({ object: feature } as any) as any;
    expect(result.html).toBe('<b>xyz-99</b>');
  });

  it('supports conditionals', () => {
    const template = '{% if depth > 5 %}deep{% else %}shallow{% endif %}';
    const getTooltip = buildDeckTooltip(template);
    expect((getTooltip({ object: createFeature({ depth: 10 }) } as any) as any).html).toBe('deep');
    expect((getTooltip({ object: createFeature({ depth: 2 }) } as any) as any).html).toBe('shallow');
  });

  it('supports loops with a custom template', () => {
    const template = '{% for p in properties %}{{ p.key }}={{ p.value }} {% endfor %}';
    const getTooltip = buildDeckTooltip(template);
    const feature = createFeature({ a: 1, b: 2 });
    const result = getTooltip({ object: feature } as any) as any;
    expect(result.html).toContain('a=1');
    expect(result.html).toContain('b=2');
  });

  it('returns null for an invalid template instead of throwing', () => {
    const getTooltip = buildDeckTooltip('{% for unclosed %}');
    expect(getTooltip({ object: createFeature({ x: 1 }) } as any)).toBeNull();
  });

  it('extracts a feature from a datum with a nested feature field', () => {
    const getTooltip = buildDeckTooltip('{{ sensor_id }}');
    const feature = createFeature({ sensor_id: 'nested' });
    const result = getTooltip({ object: { feature } } as any) as any;
    expect(result.html).toBe('nested');
  });

  it('rebuilds a feature from a picked layer datum and backing table', () => {
    const getTooltip = buildDeckTooltip('{{ sensor_id }}');
    const table: LayerTable = {
      frames: [],
      rowRefs: [{ frameIndex: 0, rowIndex: 0 }],
      geometry: [createFeature({}).geometry],
      data: [{ __idx: 0 }],
      featureSourceId: 'main',
      legacyFeatures: [createFeature({ sensor_id: 'rebuilt' }) as any],
    };
    const result = getTooltip({
      object: { __idx: 0 },
      layer: { props: { table } },
    } as any) as any;
    expect(result.html).toBe('rebuilt');
  });
});
