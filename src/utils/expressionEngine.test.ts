import { compileExpression } from './expressionEngine';

describe('expressionEngine', () => {
  it('evaluates arithmetic expressions with namespaced identifiers', () => {
    const evaluate = compileExpression('sensor.depth - primary.contour_depth_inches');

    expect(
      evaluate({
        sensor: { depth: 30 },
        primary: { contour_depth_inches: 24 },
      })
    ).toBe(6);
  });

  it('supports parentheses and unary minus', () => {
    const evaluate = compileExpression('-(primary.offset - 2) * sensor.scale');

    expect(
      evaluate({
        primary: { offset: 5 },
        sensor: { scale: 3 },
      })
    ).toBe(-9);
  });

  it('coerces missing values to zero', () => {
    const evaluate = compileExpression('sensor.depth - primary.missing');

    expect(
      evaluate({
        sensor: { depth: 12 },
        primary: {},
      })
    ).toBe(12);
  });
});
