type Expr = number | string | { op: string; args: Expr[] };

function isOperatorToken(s: string): boolean {
  return ['+', '-', '*', '/', '^', 'sqrt', 'abs', 'neg'].includes(s);
}

function tokenize(input: string): string[] {
  const regex = /(\d+\.?\d*|[a-zA-Z_]\w*|[+\-*/^(),]|sqrt|abs)/g;
  return input.match(regex) ?? [];
}

function parse(tokens: string[], pos: number): { expr: Expr; pos: number } {
  if (pos >= tokens.length) throw new Error('unexpected end');
  const tok = tokens[pos];
  if (tok === '(') {
    pos++;
    const { expr, pos: newPos } = parse(tokens, pos);
    if (tokens[newPos] !== ')') throw new Error('missing )');
    return { expr, pos: newPos + 1 };
  }
  if (isOperatorToken(tok)) {
    const { expr: arg, pos: newPos } = parse(tokens, pos + 1);
    return { expr: { op: tok, args: [arg] }, pos: newPos };
  }
  const num = parseFloat(tok);
  if (!isNaN(num)) return { expr: num, pos: pos + 1 };
  return { expr: tok, pos: pos + 1 };
}

export function parseExpression(input: string): Expr {
  const tokens = tokenize(input);
  const { expr } = parse(tokens, 0);
  return expr;
}

export function simplify(expr: Expr): Expr {
  if (typeof expr === 'number' || typeof expr === 'string') return expr;
  const args = expr.args.map(simplify);
  if (expr.op === 'neg' && typeof args[0] === 'number') return -args[0];
  if (expr.op === 'abs' && typeof args[0] === 'number') return Math.abs(args[0]);
  if (expr.op === 'sqrt' && typeof args[0] === 'number') return Math.sqrt(args[0]);

  if (expr.op === '+' && args.length === 2) {
    if (args[0] === 0) return args[1];
    if (args[1] === 0) return args[0];
    if (typeof args[0] === 'number' && typeof args[1] === 'number') return args[0] + args[1];
  }

  if (expr.op === '-' && args.length === 2) {
    if (args[1] === 0) return args[0];
    if (typeof args[0] === 'number' && typeof args[1] === 'number') return args[0] - args[1];
  }

  if (expr.op === '*' && args.length === 2) {
    if (args[0] === 0 || args[1] === 0) return 0;
    if (args[0] === 1) return args[1];
    if (args[1] === 1) return args[0];
    if (typeof args[0] === 'number' && typeof args[1] === 'number') return args[0] * args[1];
  }

  if (expr.op === '/' && args.length === 2) {
    if (args[1] === 1) return args[0];
    if (typeof args[0] === 'number' && typeof args[1] === 'number' && args[1] !== 0) return args[0] / args[1];
  }

  if (expr.op === '^' && args.length === 2) {
    if (args[1] === 0) return 1;
    if (args[1] === 1) return args[0];
    if (typeof args[0] === 'number' && typeof args[1] === 'number') return args[0] ** args[1];
  }

  return { op: expr.op, args };
}

export function differentiate(expr: Expr, variable: string): Expr {
  if (typeof expr === 'number') return 0;
  if (typeof expr === 'string') return expr === variable ? 1 : 0;

  const { op, args } = expr;

  if (op === '+' && args.length === 2) {
    return { op: '+', args: [differentiate(args[0], variable), differentiate(args[1], variable)] };
  }
  if (op === '-' && args.length === 2) {
    return { op: '-', args: [differentiate(args[0], variable), differentiate(args[1], variable)] };
  }
  if (op === '*' && args.length === 2) {
    return {
      op: '+',
      args: [
        { op: '*', args: [differentiate(args[0], variable), simplify(args[1])] },
        { op: '*', args: [simplify(args[0]), differentiate(args[1], variable)] },
      ],
    };
  }
  if (op === '/' && args.length === 2) {
    return {
      op: '/',
      args: [
        {
          op: '-',
          args: [
            { op: '*', args: [differentiate(args[0], variable), simplify(args[1])] },
            { op: '*', args: [simplify(args[0]), differentiate(args[1], variable)] },
          ],
        },
        { op: '^', args: [simplify(args[1]), 2] },
      ],
    };
  }
  if (op === '^' && args.length === 2) {
    const base = simplify(args[0]);
    const exp = simplify(args[1]);
    if (typeof exp === 'number' && typeof base === 'string' && base === variable) {
      if (exp === 0) return 0;
      if (exp === 1) return 1;
      return { op: '*', args: [exp, { op: '^', args: [variable, exp - 1] }] };
    }
    return { op: 'neg', args: [0] };
  }
  if (op === 'sin' && args.length === 1) {
    return { op: '*', args: [{ op: 'cos', args: [args[0]] }, differentiate(args[0], variable)] };
  }
  if (op === 'cos' && args.length === 1) {
    return { op: '*', args: [{ op: 'neg', args: [{ op: 'sin', args: [args[0]] }] }, differentiate(args[0], variable)] };
  }
  if (op === 'sqrt' && args.length === 1) {
    return {
      op: '/',
      args: [differentiate(args[0], variable), { op: '*', args: [2, { op: 'sqrt', args: [args[0]] }] }],
    };
  }
  if (op === 'neg' && args.length === 1) {
    return { op: 'neg', args: [differentiate(args[0], variable)] };
  }
  return { op: 'neg', args: [0] };
}

export function exprToString(expr: Expr): string {
  if (typeof expr === 'number') return String(expr);
  if (typeof expr === 'string') return expr;
  const args = expr.args.map(exprToString).join(', ');
  return `${expr.op}(${args})`;
}
