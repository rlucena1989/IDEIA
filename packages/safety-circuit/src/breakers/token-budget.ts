interface TokenRecord {
  timestamp: number;
  tokens: number;
}

const WINDOW_MS = 60 * 1000;

export class TokenBudgetBreaker {
  private static usage: TokenRecord[] = [];
  private static budget: number = 100000;

  static setBudget(maxTokens: number): void {
    TokenBudgetBreaker.budget = maxTokens;
  }

  static recordTokens(tokens: number): void {
    TokenBudgetBreaker.usage.push({ timestamp: Date.now(), tokens });
    TokenBudgetBreaker.prune();
  }

  static evaluate(): number {
    TokenBudgetBreaker.prune();
    const total = TokenBudgetBreaker.usage.reduce((sum, r) => sum + r.tokens, 0);
    return total;
  }

  static getRemainingBudget(): number {
    const consumed = TokenBudgetBreaker.evaluate();
    return Math.max(0, TokenBudgetBreaker.budget - consumed);
  }

  static getBudget(): number {
    return TokenBudgetBreaker.budget;
  }

  static reset(): void {
    TokenBudgetBreaker.usage.length = 0;
    TokenBudgetBreaker.budget = 100000;
  }

  private static prune(): void {
    const cutoff = Date.now() - WINDOW_MS;
    while (TokenBudgetBreaker.usage.length > 0 && TokenBudgetBreaker.usage[0].timestamp < cutoff) {
      TokenBudgetBreaker.usage.shift();
    }
  }
}
