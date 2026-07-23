import { LangGraphStateAnnotation, LangGraphAgentRole } from './langgraph-graph';

export function reviewerEdgeCondition(state: LangGraphStateAnnotation): LangGraphAgentRole | 'end' {
  if (state.errors.length > 0) {
    return 'programmer';
  }
  return 'tester';
}

export function testerEdgeCondition(state: LangGraphStateAnnotation): LangGraphAgentRole | 'end' {
  if (state.errors.length > 0) {
    return 'programmer';
  }
  return 'devops';
}

export function supervisorEdgeCondition(_state: LangGraphStateAnnotation): 'end' {
  return 'end';
}

export function parallelReviewerTesterEdgeCondition(state: LangGraphStateAnnotation): LangGraphAgentRole | 'end' {
  if (state.errors.length > 0) {
    return 'programmer';
  }
  return 'devops';
}

export function createDefaultEdgeConditions(): Record<string, (state: LangGraphStateAnnotation) => string> {
  return {
    analyst: () => 'architect',
    architect: () => 'programmer',
    programmer: () => 'parallel_reviewer_tester',
    reviewer: reviewerEdgeCondition,
    tester: testerEdgeCondition,
    parallel_reviewer_tester: parallelReviewerTesterEdgeCondition,
    devops: () => 'supervisor',
    supervisor: supervisorEdgeCondition,
  };
}
