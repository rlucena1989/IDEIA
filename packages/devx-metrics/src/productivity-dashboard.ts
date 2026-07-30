import { AggregatedReport, ScorecardResult, ProductivityMetric, Period, Grade, TrendDirection } from './types';
import { createLogger } from '@ideia/logger';
import { DORAMetricsCalculator } from './dora-metrics-calculator';
import { SPACEFrameworkAnalyzer } from './space-framework-analyzer';
import { TrendAnalyzer } from './trend-analyzer';
import { SurveyManager } from './survey-manager';
const logger = createLogger('productivity-dashboard');

export class ProductivityDashboard {
  constructor(
    private _doraCalculator: DORAMetricsCalculator,
    private _spaceAnalyzer: SPACEFrameworkAnalyzer,
    private _trendAnalyzer: TrendAnalyzer,
    private _surveyManager: SurveyManager,
  ) {}

  async getOverview(period: Period = '24h'): Promise<{
    dora: AggregatedReport;
    scorecard: ScorecardResult;
    trend: Array<{ metric: string; direction: TrendDirection; slope: number }>;
  }> {
    const dora = await this._doraCalculator.calculate(period);
    const history = await this._doraCalculator.getHistory(14);
    const trends = await this._trendAnalyzer.analyzeSprintTrends([]);
    const scorecard = this._computeScorecard(dora);
    return {
      dora: {
        period,
        deployFrequency: dora.deployFrequency,
        leadTime: dora.leadTime,
        mttr: dora.mttr,
        changeFailureRate: dora.changeFailureRate,
        cycleTime: 0,
        prTurnaround: 0,
        blockRate: 0,
        reworkRate: 0,
        sampleSize: 0,
      },
      scorecard,
      trend: trends.map(t => ({ metric: t.metric, direction: t.direction, slope: t.slope })),
    };
  }

  async getDetailedReport(period: Period = 'sprint'): Promise<{
    dora: AggregatedReport;
    spaceScore: number;
    nps: number;
    scorecard: ScorecardResult;
    degradationSignals: Array<{ metric: string; slope: number; magnitude: number; sustainedPeriods: number }>;
  }> {
    const doraMetrics = await this._doraCalculator.calculate(period);
    const history = await this._doraCalculator.getHistory(14);
    const degradation = await this._trendAnalyzer.detectDegradation(history);
    const spaceScore = 75;
    const nps = this._surveyManager.computeNPS();
    const scorecard = this._computeScorecard(doraMetrics);
    const report: AggregatedReport = {
      period, deployFrequency: doraMetrics.deployFrequency,
      leadTime: doraMetrics.leadTime, mttr: doraMetrics.mttr,
      changeFailureRate: doraMetrics.changeFailureRate,
      cycleTime: 0, prTurnaround: 0, blockRate: 0, reworkRate: 0, sampleSize: 0,
    };
    return { dora: report, spaceScore, nps, scorecard, degradationSignals: degradation };
  }

  async getSparklines(): Promise<Record<string, { points: number[]; labels: string[] }>> {
    const history = await this._doraCalculator.getHistory(14);
    return {
      'Deploy Frequency': { points: history.map(h => h.deployFrequency), labels: history.map(h => h.date) },
      'Lead Time (min)': { points: history.map(h => h.leadTime), labels: history.map(h => h.date) },
      'Change Failure Rate (%)': { points: history.map(h => h.changeFailureRate * 100), labels: history.map(h => h.date) },
    };
  }

  private _computeScorecard(dora: { deployFrequency: number; leadTime: number; mttr: number; changeFailureRate: number }): ScorecardResult {
    const categories = [
      { name: 'Deploy Frequency', weight: 0.25, score: Math.min(100, dora.deployFrequency * 100), grade: this._toGrade(dora.deployFrequency * 100), value: dora.deployFrequency, target: 1, trend: 'stable' as TrendDirection },
      { name: 'Lead Time', weight: 0.25, score: Math.max(0, 100 - dora.leadTime), grade: this._toGrade(100 - dora.leadTime), value: dora.leadTime, target: 60, trend: 'stable' as TrendDirection },
      { name: 'MTTR', weight: 0.20, score: Math.max(0, 100 - dora.mttr), grade: this._toGrade(100 - dora.mttr), value: dora.mttr, target: 60, trend: 'stable' as TrendDirection },
      { name: 'Change Failure Rate', weight: 0.30, score: Math.max(0, 100 - dora.changeFailureRate * 500), grade: this._toGrade(100 - dora.changeFailureRate * 500), value: dora.changeFailureRate, target: 0.1, trend: 'stable' as TrendDirection },
    ];
    const overallScore = Math.round(categories.reduce((s, c) => s + c.score * c.weight, 0));
    const overallGrade = this._toGrade(overallScore);
    const recommendations: string[] = [];
    for (const cat of categories) {
      if (cat.grade === 'D' || cat.grade === 'C') {
        recommendations.push(`[${cat.grade}] ${cat.name}: ${cat.value.toFixed(2)} (target: ${cat.target}). Needs attention.`);
      }
    }
    if (recommendations.length === 0) recommendations.push('All metrics within expected range.');
    return {
      overall: { score: overallScore, grade: overallGrade, trend: 'stable', trendDelta: 0 },
      categories,
      recommendations,
      timestamp: new Date(),
      period: '24h',
    };
  }

  private _toGrade(score: number): Grade {
    if (score >= 90) return 'A';
    if (score >= 75) return 'B';
    if (score >= 50) return 'C';
    if (score >= 25) return 'D';
    return 'F';
  }
}
