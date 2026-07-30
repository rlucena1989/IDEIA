export interface RouterConfig {
  dailyBudget: number;
  maxPerRequest: number;
  preferredOrder: string[];
  localFallback: string;
}

const DEFAULT_CONFIG: RouterConfig = {
  dailyBudget: 50,
  maxPerRequest: 0.05,
  preferredOrder: ['deepseek-coder-v2', 'gpt-4o-mini', 'claude-3-haiku', 'gpt-4o', 'claude-3.5-sonnet'],
  localFallback: 'deepseek-coder-v2',
};

const MODEL_COSTS: Record<string, { inputPer1K: number; outputPer1K: number }> = {
  'gpt-4o': { inputPer1K: 0.0025, outputPer1K: 0.01 },
  'gpt-4o-mini': { inputPer1K: 0.00015, outputPer1K: 0.0006 },
  'claude-3.5-sonnet': { inputPer1K: 0.003, outputPer1K: 0.015 },
  'claude-3-haiku': { inputPer1K: 0.00025, outputPer1K: 0.00125 },
  'deepseek-coder-v2': { inputPer1K: 0.00014, outputPer1K: 0.00042 },
};

export class CostAwareRouter {
  private config: RouterConfig;
  private dailyCost: number = 0;
  private requestCount: number = 0;
  private dailyReset: string;

  constructor(config?: Partial<RouterConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.dailyReset = new Date().toDateString();
  }

  selectModel(task: { complexity: string; estimatedTokens: number; preferLocal?: boolean; maxCost?: number }): string {
    this.checkDailyReset();
    this.requestCount++;

    if (task.preferLocal) return this.config.localFallback;

    const budgetRemaining = this.config.dailyBudget - this.dailyCost;
    if (budgetRemaining <= 0) return this.config.localFallback;

    if (task.maxCost) {
      const affordable = this.config.preferredOrder.find(m => {
        const rates = MODEL_COSTS[m];
        if (!rates) return false;
        const estimatedCost = this.estimateCost(m, task.estimatedTokens);
        return estimatedCost <= (task.maxCost as number) && estimatedCost <= budgetRemaining;
      });
      if (affordable) return affordable;
    }

    if (task.complexity === 'high' && budgetRemaining > 0.1) return 'gpt-4o';
    if (task.complexity === 'medium' && budgetRemaining > 0.02) return 'claude-3-haiku';
    return this.config.localFallback;
  }

  recordCost(model: string, inputTokens: number, outputTokens: number): number {
    const rates = MODEL_COSTS[model];
    if (!rates) return 0;
    const cost = (inputTokens / 1000) * rates.inputPer1K + (outputTokens / 1000) * rates.outputPer1K;
    this.dailyCost += cost;
    return cost;
  }

  getBudgetStatus(): { dailyCost: number; dailyBudget: number; remaining: number; requestCount: number } {
    return {
      dailyCost: this.dailyCost,
      dailyBudget: this.config.dailyBudget,
      remaining: Math.max(0, this.config.dailyBudget - this.dailyCost),
      requestCount: this.requestCount,
    };
  }

  private checkDailyReset(): void {
    const today = new Date().toDateString();
    if (this.dailyReset !== today) {
      this.dailyCost = 0;
      this.requestCount = 0;
      this.dailyReset = today;
    }
  }

  private estimateCost(model: string, tokens: number): number {
    const rates = MODEL_COSTS[model];
    if (!rates) return Infinity;
    const inputTokens = Math.round(tokens * 0.8);
    const outputTokens = Math.round(tokens * 0.2);
    return this.recordCost(model, inputTokens, outputTokens);
  }
}
