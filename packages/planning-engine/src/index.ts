export { PlanningEngine } from './planner';
export type { PlanningEngineConfig } from './planner';
export { AdaptiveDecomposer } from './decomposer';
export { DependencyAnalyzer } from './dependency-analyzer';
export { RiskEstimator } from './risk-estimator';
export { CostEstimator } from './cost-estimator';
export { FallbackPlanner } from './fallback-planner';
export { DynamicReplanner } from './replanner';

export type {
  Plan,
  PlannedStep,
  StepStatus,
  RiskLevel,
  PlanStatus,
  DecompositionStrategy,
  AcceptanceCriteria,
  RiskAssessment,
  CostEstimate,
  StepDependency,
} from './types';

import { PlanningEngine } from './planner';
import { createLogger } from '@ideia/logger';
import { PlanningEngineConfig } from './planner';
const logger = createLogger('index');

export function createPlanningEngine(config?: Partial<PlanningEngineConfig>): PlanningEngine {
  return new PlanningEngine(config);
}
