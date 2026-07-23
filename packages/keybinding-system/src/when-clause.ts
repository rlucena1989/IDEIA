export class WhenClauseEvaluator {
  private contextKeys = new Map<string, unknown>();

  setContext(key: string, value: unknown): void {
    this.contextKeys.set(key, value);
  }

  getContext(key: string): unknown {
    return this.contextKeys.get(key);
  }

  evaluate(expression: string, activeContexts?: string[]): boolean {
    const ctx = activeContexts ?? [];
    const tokens = this.tokenize(expression);
    return this.evaluateTokens(tokens, ctx);
  }

  private tokenize(expression: string): string[] {
    const tokens: string[] = [];
    let current = '';
    let inString = false;

    for (const ch of expression) {
      if (ch === '"') { inString = !inString; continue; }
      if (inString) { current += ch; continue; }
      if (ch === ' ' || ch === '!') {
        if (current) { tokens.push(current); current = ''; }
        if (ch === '!') tokens.push('!');
        continue;
      }
      if (ch === '&' || ch === '|') {
        if (current) { tokens.push(current); current = ''; }
        if (tokens[tokens.length - 1] !== '&&' && tokens[tokens.length - 1] !== '||') {
          tokens.push(ch === '&' ? '&&' : '||');
        }
        continue;
      }
      current += ch;
    }
    if (current) tokens.push(current);

    return tokens;
  }

  private evaluateTokens(tokens: string[], activeContexts: string[]): boolean {
    if (tokens.length === 0) return true;

    let result = true;
    let operator = '&&' as string;

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];

      if (token === '&&' || token === '||') {
        operator = token;
        continue;
      }

      let negate = false;
      let key = token;
      if (token === '!') {
        negate = true;
        i++;
        key = tokens[i] || '';
      }

      const matches = activeContexts.includes(key);
      const value = negate ? !matches : matches;

      if (operator === '&&') {
        result = result && value;
      } else {
        result = result || value;
      }

      if (operator === '&&' && !result) return false;
      if (operator === '||' && result) return true;
    }

    return result;
  }
}
