import { FinOpsConfig, CostAlert, CostRecommendation, ModelCost, FinOpsReport} from './types';
import { createLogger } from '@ideia/logger';
import { randomUUID } from 'crypto';
const logger = createLogger('finops-engine');

const DEFAULT_CONFIG: FinOpsConfig = {
  budgetLimit: 5000,
  dailyBudget: 50,
  monthlyBudget: 1000,
  maxPerRequest: 0.05,
  alertThreshold: 0.8,
  currency: 'USD',
  categories: ['general'],
  modelRates: {
    'gpt-4o': { inputPer1K: 0.0025, outputPer1K: 0.01 },
    'gpt-4o-mini': { inputPer1K: 0.00015, outputPer1K: 0.0006 },
    'claude-3.5-sonnet': { inputPer1K: 0.003, outputPer1K: 0.015 },
    'claude-3-haiku': { inputPer1K: 0.00025, outputPer1K: 0.00125 },
    'deepseek-coder-v2': { inputPer1K: 0.00014, outputPer1K: 0.00042 },
  },
};

export class FinOpsEngine {
  private config: FinOpsConfig;
  private modelCosts: ModelCost[] = [];
  private alerts: CostAlert[] = [];
  private dailyReset: string;
  private dailyCost: number = 0;
  private monthlyCost: number = 0;

  constructor(config?: Partial<FinOpsConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.dailyReset = new Date().toDateString();
  }

  recordModelCost(model: string, inputTokens: number, outputTokens: number, taskId: string): ModelCost {
    const rates = this.config.modelRates![model];
    if (!rates) return { model, inputTokens, outputTokens, totalCost: 0, costPerToken: 0, taskId, timestamp: new Date().toISOString() };

    const cost = (inputTokens / 1000) * rates.inputPer1K + (outputTokens / 1000) * rates.outputPer1K;
    const entry: ModelCost = { model, inputTokens, outputTokens, totalCost: cost, costPerToken: cost / (inputTokens + outputTokens || 1), taskId, timestamp: new Date().toISOString() };
    this.modelCosts.push(entry);
    this.checkDailyReset();
    this.dailyCost += cost;
    this.monthlyCost += cost;
    this.checkAlerts(cost);
    return entry;
  }

  selectCostEffectiveModel(task: { complexity: string; maxCost?: number; preferLocal?: boolean }): string {
    if (task.preferLocal) return 'deepseek-coder-v2';

    if (this.dailyCost > (this.config.dailyBudget ?? 50) * 0.7) return 'deepseek-coder-v2';

    if (task.maxCost) {
      const modelRates = this.config.modelRates ?? {};
      const affordableModels = Object.entries(modelRates)
        .filter(([_, rates]) => (1000 / 1000) * rates.inputPer1K + (100 / 1000) * rates.outputPer1K <= (task.maxCost as number))
        .map(([model]) => model);
      if (affordableModels.length > 0) return affordableModels[0];
    }

    if (task.complexity === 'high') return 'gpt-4o';
    if (task.complexity === 'medium') return 'claude-3-haiku';
    return 'deepseek-coder-v2';
  }

  getRecommendations(): CostRecommendation[] {
    const recs: CostRecommendation[] = [];
    const modelUsage = this.getModelUsage();

    if (modelUsage['gpt-4o'] && modelUsage['gpt-4o'].cost > 50) {
      recs.push({ type: 'use_cheaper_model', description: 'High gpt-4o usage - consider routing simpler tasks to gpt-4o-mini', potentialSavings: modelUsage['gpt-4o'].cost * 0.6, priority: 'medium', estimatedSavings: modelUsage['gpt-4o'].cost * 0.6, confidence: 0.8 } as CostRecommendation);
    }
    if (this.monthlyCost > (this.config.monthlyBudget ?? 1000) * 0.6) {
      recs.push({ type: 'enable_cache', description: 'Enable LLM response caching to reduce repeated queries', potentialSavings: this.monthlyCost * 0.3, priority: 'medium', estimatedSavings: this.monthlyCost * 0.3, confidence: 0.7 } as CostRecommendation);
    }
    if (this.modelCosts.length > 100) {
      recs.push({ type: 'batch_requests', description: 'Batch similar requests to reduce API overhead', potentialSavings: this.monthlyCost * 0.15, priority: 'low', estimatedSavings: this.monthlyCost * 0.15, confidence: 0.6 } as CostRecommendation);
    }

    return recs;
  }

  getReport(): FinOpsReport {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const modelUsage = this.getModelUsage();
    return {
      period: `${startOfMonth.toISOString()} to ${now.toISOString()}`,
      dailyCost: this.dailyCost,
      monthlyCost: this.monthlyCost,
      byModel: modelUsage,
      byTask: this.getTaskUsage(),
      alerts: this.alerts.slice(-10),
      recommendations: this.getRecommendations(),
      budgetRemaining: Math.max(0, (this.config.monthlyBudget ?? 1000) - this.monthlyCost),
      budgetPercentage: Math.round((this.monthlyCost / (this.config.monthlyBudget ?? 1000)) * 100),
      modelCosts: this.modelCosts,
    };
  }

  private getModelUsage(): Record<string, { calls: number; totalTokens: number; cost: number }> {
    const usage: Record<string, { calls: number; totalTokens: number; cost: number }> = {};
    for (const mc of this.modelCosts) {
      const modelKey = mc.model;
      if (!usage[modelKey]) usage[modelKey] = { calls: 0, totalTokens: 0, cost: 0 };
      usage[modelKey].calls++;
      usage[modelKey].totalTokens += (mc.inputTokens ?? 0) + (mc.outputTokens ?? 0);
      usage[modelKey].cost += mc.totalCost;
    }
    return usage;
  }

  private getTaskUsage(): Record<string, { calls: number; cost: number }> {
    const usage: Record<string, { calls: number; cost: number }> = {};
    for (const mc of this.modelCosts) {
      const taskKey = mc.taskId ?? 'unknown';
      if (!usage[taskKey]) usage[taskKey] = { calls: 0, cost: 0 };
      usage[taskKey].calls++;
      usage[taskKey].cost += mc.totalCost;
    }
    return usage;
  }

  private checkDailyReset(): void {
    const today = new Date().toDateString();
    if (this.dailyReset !== today) {
      this.dailyCost = 0;
      this.dailyReset = today;
    }
  }

  private checkAlerts(cost: number): void {
    const dailyBudget = this.config.dailyBudget ?? 50;
    const monthlyBudget = this.config.monthlyBudget ?? 1000;
    const maxPerRequest = this.config.maxPerRequest ?? 0.05;
    const alertThreshold = this.config.alertThreshold ?? 0.8;
    if (this.dailyCost > dailyBudget) {
      this.addAlert('daily_limit', 'critical', `Daily budget exceeded: $${this.dailyCost.toFixed(2)} > $${dailyBudget}`, cost);
    }
    if (this.monthlyCost > monthlyBudget) {
      this.addAlert('monthly_limit', 'critical', `Monthly budget exceeded: $${this.monthlyCost.toFixed(2)} > $${monthlyBudget}`, cost);
    }
    if (cost > maxPerRequest) {
      this.addAlert('per_request', 'warning', `Per-request cost exceeded: $${cost.toFixed(4)} > $${maxPerRequest}`, cost);
    }
    if (this.monthlyCost > monthlyBudget * alertThreshold) {
      this.addAlert('budget_depleted', 'warning', `Monthly budget ${Math.round(alertThreshold * 100)}% depleted`, this.monthlyCost);
    }
  }

  private addAlert(type: string, severity: string, message: string, cost: number): void {
    this.alerts.push({ id: randomUUID(), type, severity, message, timestamp: new Date().toISOString(), cost, category: 'budget', amount: cost, threshold: 0 });
  }

  reset(): void {
    this.modelCosts = [];
    this.alerts = [];
    this.dailyCost = 0;
    this.monthlyCost = 0;
  }
}
