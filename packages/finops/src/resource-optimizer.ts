import { ResourceMetric, ResourceRecommendation, OptimizationRecommendation, CostRecord } from './types';
import { createLogger } from '@ideia/logger';
const logger = createLogger('resource-optimizer');

export class ResourceOptimizer {
  private _recommendations: OptimizationRecommendation[] = [];

  async analyzeResource(resource: ResourceMetric): Promise<ResourceRecommendation[]> {
    const recommendations: ResourceRecommendation[] = [];
    if (resource.usage.cpu < 0.2) {
      recommendations.push({
        recommendedSize: this._downsizeResource(resource.currentSize),
        estimatedSavings: resource.costPerMonth * 0.4,
        confidence: 0.85,
        reason: `CPU utilization at ${(resource.usage.cpu * 100).toFixed(0)}% — candidate for downsizing`,
        risk: 'low',
      });
    }
    if (resource.usage.memory < 0.3) {
      recommendations.push({
        recommendedSize: this._reduceMemory(resource.currentSize),
        estimatedSavings: resource.costPerMonth * 0.3,
        confidence: 0.8,
        reason: `Memory utilization at ${(resource.usage.memory * 100).toFixed(0)}% — can reduce memory allocation`,
        risk: 'low',
      });
    }
    if (resource.usage.cpu > 0.8 && resource.usage.memory > 0.8) {
      recommendations.push({
        recommendedSize: this._upsizeResource(resource.currentSize),
        estimatedSavings: 0,
        confidence: 0.9,
        reason: `High utilization (CPU: ${(resource.usage.cpu * 100).toFixed(0)}%, Memory: ${(resource.usage.memory * 100).toFixed(0)}%) — consider upsizing`,
        risk: 'medium',
      });
    }
    return recommendations;
  }

  generateModelRoutingRecommendation(records: CostRecord[]): OptimizationRecommendation | null {
    const byModel = this._groupByModel(records);
    const totalLLM = Object.values(byModel).reduce((s, v) => s + v, 0);
    if (totalLLM === 0) return null;
    for (const [model, cost] of Object.entries(byModel)) {
      const ratio = cost / totalLLM;
      if (model.includes('gpt-4o') && ratio > 0.5) {
        return {
          id: `opt-model-${Date.now()}`,
          type: 'model_routing',
          title: 'Reduce expensive model usage',
          description: `${model} accounts for ${(ratio * 100).toFixed(0)}% of LLM costs. Route simpler tasks to cheaper alternatives.`,
          estimatedSavings: cost * 0.4,
          implementation: 'Adjust ProviderRouter rules',
          risk: 'low',
          effort: '2h',
        };
      }
    }
    return null;
  }

  generateCacheRecommendation(totalLLMCost: number): OptimizationRecommendation {
    return {
      id: `opt-cache-${Date.now()}`,
      type: 'cache',
      title: 'Optimize LLM cache strategy',
      description: 'Increase TTL for stable responses and expand cacheable patterns',
      estimatedSavings: totalLLMCost * 0.15,
      implementation: 'Adjust LLMCache configuration',
      risk: 'low',
      effort: '4h',
    };
  }

  generateCompressionRecommendation(totalLLMCost: number): OptimizationRecommendation {
    return {
      id: `opt-compress-${Date.now()}`,
      type: 'compression',
      title: 'Enable context compression',
      description: 'Context compression can reduce token usage by 40-60% for routine tasks',
      estimatedSavings: totalLLMCost * 0.2,
      implementation: 'Enable ContextCompressor for N0-N2 tasks',
      risk: 'medium',
      effort: '8h',
    };
  }

  getAllRecommendations(): OptimizationRecommendation[] {
    return [...this._recommendations];
  }

  addRecommendation(rec: OptimizationRecommendation): void {
    this._recommendations.push(rec);
  }

  clearRecommendations(): void {
    this._recommendations = [];
  }

  private _downsizeResource(current: string): string {
    const sizes = ['nano', 'micro', 'small', 'medium', 'large', 'xlarge', '2xlarge'];
    const idx = sizes.indexOf(current.split('-').pop() ?? '');
    if (idx > 0) {
      return current.replace(sizes[idx] ?? '', sizes[idx - 1] ?? 'small');
    }
    return current;
  }

  private _reduceMemory(current: string): string {
    return current.replace(/\d+gb/i, (m) => {
      const gb = parseInt(m);
      return `${Math.max(1, Math.floor(gb / 2))}GB`;
    });
  }

  private _upsizeResource(current: string): string {
    const sizes = ['nano', 'micro', 'small', 'medium', 'large', 'xlarge', '2xlarge'];
    const idx = sizes.indexOf(current.split('-').pop() ?? '');
    if (idx < sizes.length - 1) {
      return current.replace(sizes[idx] ?? '', sizes[idx + 1] ?? 'xlarge');
    }
    return current;
  }

  private _groupByModel(records: CostRecord[]): Record<string, number> {
    const byModel: Record<string, number> = {};
    for (const r of records) {
      const model = r.metadata?.model as string | undefined;
      if (model) {
        byModel[model] = (byModel[model] ?? 0) + r.amount;
      }
    }
    return byModel;
  }
}
