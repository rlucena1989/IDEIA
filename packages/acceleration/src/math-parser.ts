type Token = { kind: 'num'; value: number } | { kind: 'op'; value: string } | { kind: 'ident'; value: string } | { kind: 'paren'; value: string };

export function tokenizeMath(input: string): Token[] {
  const regex = /(\d+\.?\d*|[a-zA-Z_]\w*|[+\-*/^(),]|sqrt|abs|sin|cos|tan|log)/g;
  const tokens: Token[] = [];
  let match;
  while ((match = regex.exec(input)) !== null) {
    const val = match[0];
    if (/^\d/.test(val)) tokens.push({ kind: 'num', value: parseFloat(val) });
    else if (['+', '-', '*', '/', '^'].includes(val)) tokens.push({ kind: 'op', value: val });
    else if (['(', ')'].includes(val)) tokens.push({ kind: 'paren', value: val });
    else tokens.push({ kind: 'ident', value: val });
  }
  return tokens;
}

export function isNumeric(s: string): boolean {
  return /^\d+\.?\d*$/.test(s);
}

export function extractNumbers(text: string): number[] {
  return (text.match(/-?\d+\.?\d*/g) ?? []).map(Number);
}

export function evaluateSimpleMath(input: string): number | null {
  try {
    const sanitized = input.replace(/[^0-9+\-*/.() ]/g, '');
    if (!sanitized) return null;
    const result = Function(`"use strict"; return (${sanitized})`)();
    if (typeof result === 'number' && isFinite(result)) return result;
    return null;
  } catch {
    return null;
  }
}
