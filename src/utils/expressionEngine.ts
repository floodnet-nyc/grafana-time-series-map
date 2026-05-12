type Token =
  | { type: 'number'; value: number }
  | { type: 'identifier'; value: string }
  | { type: 'operator'; value: '+' | '-' | '*' | '/' | '(' | ')' };

type ExpressionNode =
  | { type: 'number'; value: number }
  | { type: 'identifier'; path: string[] }
  | { type: 'unary'; operator: '-'; argument: ExpressionNode }
  | { type: 'binary'; operator: '+' | '-' | '*' | '/'; left: ExpressionNode; right: ExpressionNode };

export interface ExpressionScope {
  [key: string]: unknown;
}

export function compileExpression(expression: string): (scope: ExpressionScope) => number {
  const tokens = tokenize(expression);
  const parser = new Parser(tokens);
  const ast = parser.parseExpression();
  parser.expectEnd();
  return (scope: ExpressionScope) => evaluateNode(ast, scope);
}

function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let index = 0;

  while (index < input.length) {
    const char = input[index];

    if (/\s/.test(char)) {
      index += 1;
      continue;
    }

    if (/[0-9.]/.test(char)) {
      let end = index + 1;
      while (end < input.length && /[0-9.]/.test(input[end])) {
        end += 1;
      }
      const value = Number(input.slice(index, end));
      if (!Number.isFinite(value)) {
        throw new Error(`Invalid number in expression: ${input.slice(index, end)}`);
      }
      tokens.push({ type: 'number', value });
      index = end;
      continue;
    }

    if (/[A-Za-z_]/.test(char)) {
      let end = index + 1;
      while (end < input.length && /[A-Za-z0-9_.]/.test(input[end])) {
        end += 1;
      }
      tokens.push({ type: 'identifier', value: input.slice(index, end) });
      index = end;
      continue;
    }

    if (char === '+' || char === '-' || char === '*' || char === '/' || char === '(' || char === ')') {
      tokens.push({ type: 'operator', value: char });
      index += 1;
      continue;
    }

    throw new Error(`Unsupported token in expression: ${char}`);
  }

  return tokens;
}

class Parser {
  private index = 0;

  constructor(private readonly tokens: Token[]) {}

  parseExpression(): ExpressionNode {
    let node = this.parseTerm();

    while (this.peekOperator('+') || this.peekOperator('-')) {
      const operator = this.consume().value as '+' | '-';
      node = {
        type: 'binary',
        operator,
        left: node,
        right: this.parseTerm(),
      };
    }

    return node;
  }

  expectEnd() {
    if (this.index < this.tokens.length) {
      throw new Error(`Unexpected token at end of expression`);
    }
  }

  private parseTerm(): ExpressionNode {
    let node = this.parseFactor();

    while (this.peekOperator('*') || this.peekOperator('/')) {
      const operator = this.consume().value as '*' | '/';
      node = {
        type: 'binary',
        operator,
        left: node,
        right: this.parseFactor(),
      };
    }

    return node;
  }

  private parseFactor(): ExpressionNode {
    if (this.peekOperator('-')) {
      this.consume();
      return {
        type: 'unary',
        operator: '-',
        argument: this.parseFactor(),
      };
    }

    if (this.peekOperator('(')) {
      this.consume();
      const expr = this.parseExpression();
      this.expectOperator(')');
      return expr;
    }

    const token = this.consume();
    if (!token) {
      throw new Error('Unexpected end of expression');
    }

    if (token.type === 'number') {
      return { type: 'number', value: token.value };
    }

    if (token.type === 'identifier') {
      return { type: 'identifier', path: token.value.split('.') };
    }

    throw new Error('Unexpected token in expression');
  }

  private expectOperator(operator: Token['value']) {
    const token = this.consume();
    if (!token || token.type !== 'operator' || token.value !== operator) {
      throw new Error(`Expected operator ${operator}`);
    }
  }

  private peekOperator(operator: Token['value']) {
    const token = this.tokens[this.index];
    return token?.type === 'operator' && token.value === operator;
  }

  private consume() {
    const token = this.tokens[this.index];
    this.index += 1;
    return token;
  }
}

function evaluateNode(node: ExpressionNode, scope: ExpressionScope): number {
  switch (node.type) {
    case 'number':
      return node.value;
    case 'identifier':
      return coerceToNumber(resolvePath(scope, node.path));
    case 'unary':
      return -evaluateNode(node.argument, scope);
    case 'binary': {
      const left = evaluateNode(node.left, scope);
      const right = evaluateNode(node.right, scope);
      switch (node.operator) {
        case '+':
          return left + right;
        case '-':
          return left - right;
        case '*':
          return left * right;
        case '/':
          return right === 0 ? 0 : left / right;
      }
    }
  }
}

function resolvePath(scope: ExpressionScope, path: string[]): unknown {
  let current: unknown = scope;
  for (const segment of path) {
    if (!current || typeof current !== 'object' || !(segment in current)) {
      return 0;
    }
    current = (current as Record<string, unknown>)[segment];
  }
  return current;
}

function coerceToNumber(value: unknown): number {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}
