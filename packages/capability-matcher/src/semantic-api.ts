import { SemanticMatcher } from './semantic-matcher';
import { SemanticNeed, SemanticMatchResult, AgentRecommendation, ContextPackRecommendation, WorkflowRecommendation } from './semantic-types';

const engine = new SemanticMatcher();

export function analyzeNeed(description: string, teamSize?: number): SemanticNeed {
  return engine.analyzeNeed(description, teamSize);
}

export function getRecommendations(need: SemanticNeed): SemanticMatchResult {
  return engine.match(need);
}

export function getAgentForTask(description: string): AgentRecommendation {
  return engine.getAgentForTask(description);
}

export function getContextForTask(description: string): ContextPackRecommendation[] {
  return engine.getContextForTask(description);
}

export function getWorkflowForTask(description: string): WorkflowRecommendation {
  return engine.getWorkflowForTask(description);
}

export function suggestPipeline(description: string): {
  agents: AgentRecommendation[];
  packs: ContextPackRecommendation[];
  workflow: WorkflowRecommendation;
} {
  return engine.suggestPipeline(description);
}
