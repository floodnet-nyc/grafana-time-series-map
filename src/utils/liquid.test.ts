import { renderLiquidTemplate } from './liquid';

describe('liquid filters', () => {
  it('formats dates with dateOnly without the time component', () => {
    expect(renderLiquidTemplate('{{ value | dateOnly }}', { value: '2021-12-14T11:43:00Z' })).toBe('12/14/2021');
  });

  it('renders present fallback values unchanged when dateOnly receives invalid input', () => {
    expect(renderLiquidTemplate('{{ value | dateOnly }}', { value: 'present' })).toBe('present');
  });
});
