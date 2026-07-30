import { SurveyResponse, SurveyTemplate, SurveyDimension, CorrelationResult } from './types';
import { createLogger } from '@ideia/logger';
const logger = createLogger('survey-manager');

export class SurveyManager {
  private _templates: Map<string, SurveyTemplate> = new Map();
  private _responses: SurveyResponse[] = [];

  registerTemplate(template: SurveyTemplate): void {
    this._templates.set(template.id, template);
  }

  getTemplate(id: string): SurveyTemplate | undefined {
    return this._templates.get(id);
  }

  listTemplates(): SurveyTemplate[] {
    return Array.from(this._templates.values());
  }

  createSurvey(templateId: string, userId: string, scores: Record<string, number>): SurveyResponse[] {
    const template = this._templates.get(templateId);
    if (!template) throw new Error(`Template ${templateId} not found`);
    const responses: SurveyResponse[] = [];
    for (const question of template.questions) {
      const score = scores[question.id] ?? 3;
      const response: SurveyResponse = {
        id: `resp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        userId,
        dimension: question.dimension,
        score,
        type: question.type,
        comment: undefined,
        isPositive: score >= 4,
        timestamp: new Date(),
      };
      responses.push(response);
      this._responses.push(response);
    }
    return responses;
  }

  getResponsesByUser(userId: string): SurveyResponse[] {
    return this._responses.filter(r => r.userId === userId);
  }

  getResponsesByDimension(dimension: SurveyDimension): SurveyResponse[] {
    return this._responses.filter(r => r.dimension === dimension);
  }

  getAverageScore(dimension?: SurveyDimension): number {
    const filtered = dimension ? this._responses.filter(r => r.dimension === dimension) : this._responses;
    if (filtered.length === 0) return 0;
    return filtered.reduce((s, r) => s + r.score, 0) / filtered.length;
  }

  computeNPS(): number {
    const promoters = this._responses.filter(r => r.type === 'nps' && r.score >= 9).length;
    const detractors = this._responses.filter(r => r.type === 'nps' && r.score <= 6).length;
    const total = this._responses.filter(r => r.type === 'nps').length;
    if (total === 0) return 0;
    return ((promoters - detractors) / total) * 100;
  }

  computeSUS(): number {
    const susResponses = this._responses.filter(r => r.type === 'sus');
    if (susResponses.length === 0) return 0;
    let sum = 0;
    for (const r of susResponses) {
      sum += r.isPositive ? (r.score - 1) : (5 - r.score);
    }
    return (sum / susResponses.length) * 25;
  }

  async computeCorrelations(metrics: { cycleTime: number; blockRate: number; leadTime: number; changeFailureRate: number }): Promise<CorrelationResult> {
    const correlations: CorrelationResult['correlations'] = [];
    const dimMap: Record<string, number> = {
      satisfaction: metrics.cycleTime,
      autonomy: metrics.blockRate,
      fluidez: metrics.leadTime,
      confianca: metrics.changeFailureRate,
      sobrecarga: metrics.cycleTime,
    };
    for (const [dim, metricValue] of Object.entries(dimMap)) {
      const dimResponses = this._responses.filter(r => r.dimension === dim);
      if (dimResponses.length < 5) continue;
      const meanScore = dimResponses.reduce((s, r) => s + r.score, 0) / dimResponses.length;
      const correlation = this._pearsonCorrelation(
        dimResponses.map(r => r.score),
        dimResponses.map(() => metricValue),
      );
      correlations.push({
        dimension: dim,
        meanScore: meanScore * 20,
        correlation,
        interpretation: Math.abs(correlation) > 0.5
          ? 'Strong correlation with objective metric'
          : 'Weak correlation — qualitative metric captures different dimension',
      });
    }
    return {
      correlations,
      nps: this.computeNPS(),
      sus: this.computeSUS(),
      topPainPoints: this._extractPainPoints(),
    };
  }

  clear(): void {
    this._responses = [];
  }

  private _pearsonCorrelation(x: number[], y: number[]): number {
    const n = x.length;
    if (n < 3) return 0;
    const xMean = x.reduce((a, b) => a + b, 0) / n;
    const yMean = y.reduce((a, b) => a + b, 0) / n;
    const num = x.reduce((s, xi, i) => s + (xi - xMean) * (y[i] - yMean), 0);
    const denX = Math.sqrt(x.reduce((s, xi) => s + (xi - xMean) ** 2, 0));
    const denY = Math.sqrt(y.reduce((s, yi) => s + (yi - yMean) ** 2, 0));
    return denX * denY > 0 ? num / (denX * denY) : 0;
  }

  private _extractPainPoints(): string[] {
    const painPoints = this._responses
      .filter(r => r.score <= 3 && r.comment)
      .map(r => r.comment as string);
    const freq = new Map<string, number>();
    for (const p of painPoints) {
      freq.set(p, (freq.get(p) ?? 0) + 1);
    }
    return Array.from(freq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([point, count]) => `${point} (${count}x)`);
  }
}
