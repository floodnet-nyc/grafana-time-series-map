import { compileExpression } from './expressionEngine';

describe('expressionEngine', () => {
  it('evaluates arithmetic expressions with namespaced identifiers', () => {
    const evaluate = compileExpression('A.depth_inches - this.contour_depth_inches');

    expect(
      evaluate({
        A: { depth_inches: 30 },
        this: { contour_depth_inches: 24 },
      })
    ).toBe(6);
  });

  it('supports parentheses and unary minus', () => {
    const evaluate = compileExpression('-(this.offset - 2) * A.scale');

    expect(
      evaluate({
        this: { offset: 5 },
        A: { scale: 3 },
      })
    ).toBe(-9);
  });

  it('coerces missing values to zero', () => {
    const evaluate = compileExpression('A.depth_inches - this.missing');

    expect(
      evaluate({
        A: { depth_inches: 12 },
        this: {},
      })
    ).toBe(12);
  });
});
