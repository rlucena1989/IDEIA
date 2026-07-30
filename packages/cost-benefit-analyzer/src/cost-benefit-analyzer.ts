import { AdaptiveDepthSelector } from './adaptive-depth-selector';
import { createLogger } from '@ideia/logger';
import { ColdStartHandler } from './cold-start-handler';
import { ROICalculator } from './roi-calculator';
import { AnalyzerMetrics, CalibrationPoint, CostAnalysisReport, Goal, OptimizationResult, PlanningContext, PlanningDecision, ROIResult } from './types';
const logger = createLogger('cost-benefit-analyzer');

export class CostBenefitAnalyzer {
  private _roiCalc: ROICalculator;
  private _depthSelector: AdaptiveDepthSelector;
  private _coldStartHandler: ColdStartHandler;
  private _calibrationPoints: CalibrationPoint[] = [];
  private _totalEvaluations = 0;

  constructor() {
    this._roiCalc = new ROICalculator();
    this._depthSelector = new AdaptiveDepthSelector();
    this._coldStartHandler = new ColdStartHandler();
  }

  async evaluate(goal: Goal, context: PlanningContext): Promise<PlanningDecision> {
    this._totalEvaluations++;
    if (goal.stepCount !== undefined && goal.stepCount < 3) {
      return { decision: 'execute_directly', reason: 'Too few steps to plan' };
    }
    if (goal.complexity < 0.3 && (goal.fileCount ?? 0) < 5) {
      return { decision: 'execute_directly', reason: 'Simple task, low risk' };
    }
    if (context.historyLength < 10) {
      return { decision: 'plan', depth: 'shallow', reason: `Cold start: ${context.historyLength}/10 data points` };
    }
    const roi = this._roiCalc.compute(goal, context);
    if (roi.shouldPlan) {
      const depth = this._depthSelector.select(roi.roi, goal.complexity);
      return { decision: 'plan', depth, reason: `ROI ${(roi.roi * 100).toFixed(0)}%`, roi };
    }
    return { decision: 'execute_directly', reason: `ROI ${(roi.roi * 100).toFixed(0)}% below threshold`, roi };
  }

  analyzeCosts(goal: Goal, _context?: PlanningContext): CostAnalysisReport {
    return {
      combined: { direct: 5000, withShallowPlan: 3500, withDeepPlan: 8000 },
      planCost: { base: 2000, complexity: goal.complexity * 1500, files: 500, dependencies: 300, overhead: 200, retries: 100, total: 5000, estimatedSeconds: 100, tokenBreakdown: { contextTokens: 2000, analysisTokens: 2000, generationTokens: 1000 } },
      execWithPlan: { base: 3000, complexity: 0, files: 0, dependencies: 0, overhead: 0, retries: 300, total: 3300, estimatedSeconds: 66, tokenBreakdown: { contextTokens: 3000, analysisTokens: 0, generationTokens: 300 } },
      execWithoutPlan: { base: 3000, complexity: 0, files: 0, dependencies: 0, overhead: 900, retries: 600, total: 4500, estimatedSeconds: 135, tokenBreakdown: { contextTokens: 3000, analysisTokens: 900, generationTokens: 600 } },
      tokenEstimate: 5000,
      timeEstimate: 100,
      memoryEstimate: 150,
    };
  }

  async optimize(goal: Goal, _context: PlanningContext, _roi: ROIResult): Promise<OptimizationResult> {
    return {
      selectedAction: 'plan', selectedDepth: 'medium', expectedUtility: 0.75,
      alternatives: [
        { action: 'plan', depth: 'shallow', utility: 0.6, cost: 2000, quality: 0.6 },
        { action: 'plan', depth: 'medium', utility: 0.75, cost: 4000, quality: 0.8 },
        { action: 'plan', depth: 'deep', utility: 0.7, cost: 7000, quality: 0.9 },
        { action: 'execute_directly', depth: 'none', utility: 0.4, cost: 500, quality: 0.4 },
      ],
    };
  }

  calibrate(actual: CalibrationPoint): void {
    this._calibrationPoints.push(actual);
    if (this._calibrationPoints.length > 100) this._calibrationPoints.shift();
  }

  getMetrics(): AnalyzerMetrics {
    const accuracy = this._calibrationPoints.length > 10
      ? 1 - this._calibrationPoints.reduce((s, p) => s + Math.abs(p.predictedQuality - p.actualQuality), 0) / this._calibrationPoints.length
      : 0;
    return { calibrationAccuracy: Math.max(0, accuracy), adaptiveThreshold: 0.20, totalEvaluations: this._totalEvaluations };
  }
}
