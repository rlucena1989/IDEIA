import { SPACEScore, SurveyResponse, AggregatedReport } from './types';
import { createLogger } from '@ideia/logger';
const logger = createLogger('space-framework-analyzer');

export class SPACEFrameworkAnalyzer {
  private _surveyResponses: SurveyResponse[] = [];

  addResponse(response: SurveyResponse): void {
    this._surveyResponses.push(response);
  }

  addBatch(responses: SurveyResponse[]): void {
    this._surveyResponses.push(...responses);
  }

  async analyze(report: AggregatedReport): Promise<SPACEScore> {
    const satisfaction = this._averageDimension('satisfaction');
    const performance = this._scorePerformance(report);
    const activity = this._scoreActivity(report);
    const communication = this._scoreCommunication(report);
    const efficiency = this._scoreEfficiency(report);
    return {
      satisfaction,
      performance,
      activity,
      communication,
      efficiency,
      timestamp: new Date(),
    };
  }

  async getDetailedAnalysis(report: AggregatedReport): Promise<{
    spaceScore: SPACEScore;
    dimensions: Array<{ name: string; score: number; interpretation: string }>;
    recommendations: string[];
  }> {
    const spaceScore = await this.analyze(report);
    const dimensions = [
      { name: 'Satisfaction', score: spaceScore.satisfaction, interpretation: this._interpretScore(spaceScore.satisfaction) },
      { name: 'Performance', score: spaceScore.performance, interpretation: this._interpretScore(spaceScore.performance) },
      { name: 'Activity', score: spaceScore.activity, interpretation: this._interpretScore(spaceScore.activity) },
      { name: 'Communication', score: spaceScore.communication, interpretation: this._interpretScore(spaceScore.communication) },
      { name: 'Efficiency', score: spaceScore.efficiency, interpretation: this._interpretScore(spaceScore.efficiency) },
    ];
    const recommendations = dimensions
      .filter(d => d.score < 60)
      .map(d => `Improve ${d.name}: ${d.interpretation}`);
    return { spaceScore, dimensions, recommendations };
  }

  getResponses(dimension?: string): SurveyResponse[] {
    if (dimension) return this._surveyResponses.filter(r => r.dimension === dimension);
    return [...this._surveyResponses];
  }

  getResponseCount(): number {
    return this._surveyResponses.length;
  }

  clearResponses(): void {
    this._surveyResponses = [];
  }

  private _averageDimension(dimension: string): number {
    const responses = this._surveyResponses.filter(r => r.dimension === dimension);
    if (responses.length === 0) return 70;
    return responses.reduce((s, r) => s + r.score, 0) / responses.length * 20;
  }

  private _scorePerformance(report: AggregatedReport): number {
    const cycleTimeScore = Math.max(0, 100 - (report.cycleTime / 10));
    return Math.min(100, cycleTimeScore);
  }

  private _scoreActivity(report: AggregatedReport): number {
    return Math.min(100, report.deployFrequency * 50);
  }

  private _scoreCommunication(report: AggregatedReport): number {
    const leadTimeScore = Math.max(0, 100 - (report.prTurnaround / 5));
    return Math.min(100, leadTimeScore);
  }

  private _scoreEfficiency(report: AggregatedReport): number {
    const reworkScore = Math.max(0, 100 - (report.reworkRate * 200));
    const blockScore = Math.max(0, 100 - (report.blockRate * 200));
    return (reworkScore + blockScore) / 2;
  }

  private _interpretScore(score: number): string {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Needs improvement';
    return 'Critical';
  }
}
