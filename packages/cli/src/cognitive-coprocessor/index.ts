export { normalizeInput } from './normalize';
export { computeMetrics } from './metrics';
export { rankPriorities } from './rank';
export { detectInconsistencies } from './inconsistencies';
export { simulateOutcomes } from './simulate';
export { validateAnswer } from './validate';
export { generateReasoningHints } from './hints';
export { prepareContextForLLM } from './context';

export type {
  NormalizedOutput, Anomaly, Feature, Metadata,
  MetricResult, MetricsOutput, MetricConfig,
  PriorityItem, PriorityWeights, RankedItem, RankOutput,
  Rule, Inconsistency, InconsistencyOutput,
  Scenario, ScenarioRule, Outcome, SimulateOutput, SimConfig,
  Issue, ValidateOutput,
  ProblemDescriptor, ContextInfo, Hint, HintsOutput,
  ContextOptions, CognitiveContext, CoprocessOptions,
} from './types';

export { DEFAULT_PRIORITY_WEIGHTS } from './types';
