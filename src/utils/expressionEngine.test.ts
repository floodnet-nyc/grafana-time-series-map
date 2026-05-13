import { compileExpression } from './expressionEngine';

describe('expressionEngine', () => {
  it('evaluates arithmetic expressions with namespaced identifiers', () => {
    const evaluate = compileExpression('sensor.depth - this.contour_depth_inches');

    expect(
      evaluate({
        sensor: { depth: 30 },
        this: { contour_depth_inches: 24 },
      })
    ).toBe(6);
  });

  it('supports parentheses and unary minus', () => {
    const evaluate = compileExpression('-(this.offset - 2) * sensor.scale');

    expect(
      evaluate({
        this: { offset: 5 },
        sensor: { scale: 3 },
      })
    ).toBe(-9);
  });

  it('coerces missing values to zero', () => {
    const evaluate = compileExpression('sensor.depth - this.missing');

    expect(
      evaluate({
        sensor: { depth: 12 },
        this: {},
      })
    ).toBe(12);
  });
});
