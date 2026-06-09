import { buildColorAccessor } from './colorScales';
import type { ColorScaleConfig } from '../../types';

describe('buildColorAccessor alpha scaling', () => {
  it('scales gradient alpha from the configured value domain', () => {
    const colorScale: ColorScaleConfig = {
      type: 'gradient',
      field: { source: 'main', field: 'value' },
      schemeName: 'Turbo',
      scaleMin: 0,
      scaleMax: 100,
      alphaMin: 0,
      alphaMax: 1,
      alphaGamma: 1,
    };

    const getColor = buildColorAccessor(colorScale);

    expect(getColor({ properties: { value: 0 } } as any, {} as any)[3]).toBe(0);
    expect(getColor({ properties: { value: 50 } } as any, {} as any)[3]).toBe(128);
    expect(getColor({ properties: { value: 100 } } as any, {} as any)[3]).toBe(255);
  });

  it('applies scaled alpha on top of threshold step alpha', () => {
    const colorScale: ColorScaleConfig = {
      type: 'threshold',
      field: { source: 'main', field: 'value' },
      steps: [
        { value: 0, color: [10, 20, 30, 128] },
        { value: 10, color: [40, 50, 60, 128] },
      ],
      scaleMin: 0,
      scaleMax: 10,
      alphaMin: 0,
      alphaMax: 1,
      alphaGamma: 1,
    };

    const getColor = buildColorAccessor(colorScale);

    expect(getColor({ properties: { value: 0 } } as any, {} as any)).toEqual([10, 20, 30, 0]);
    expect(getColor({ properties: { value: 10 } } as any, {} as any)).toEqual([40, 50, 60, 128]);
  });
});
