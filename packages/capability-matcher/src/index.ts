export {
  ProjectNeed,
  MatchScore,
  MatchResult,
  MatchingProfile,
  Suggestion,
  MatchingReport
} from './types';

export { CapabilityMatcher } from './matcher-engine';

export {
  SemanticNeed,
  SemanticMatchResult,
  CapabilityMatch,
  AgentRecommendation,
  ContextPackRecommendation,
  WorkflowRecommendation,
  ProjectProfile,
} from './semantic-types';

export { SemanticAnalyzer } from './analyzer';
export { SemanticMatcher } from './semantic-matcher';
export { AgentRouter } from './agent-router';
export { ContextPackRouter } from './context-router';
export { WorkflowRouter } from './workflow-router';
export { calculateConfidence, normalizeKeywords, normalizeStack, clamp, WEIGHTS } from './scoring';
export * from './rules';
export {
  analyzeNeed,
  getRecommendations,
  getAgentForTask,
  getContextForTask,
  getWorkflowForTask,
  suggestPipeline,
} from './semantic-api';
