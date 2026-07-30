import { LangGraphAgent, LangGraphAgentRole, LangGraphStateAnnotation, LangGraphNodeFunction, createLangGraphAgent } from './langgraph-graph';
import { createLogger } from '@ideia/logger';
import { createAnalystNode } from './nodes/analyst-node';
import { createArchitectNode } from './nodes/architect-node';
import { createProgrammerNode } from './nodes/programmer-node';
import { createReviewerNode } from './nodes/reviewer-node';
import { createTesterNode } from './nodes/tester-node';
import { createDevOpsNode } from './nodes/devops-node';
import { createSupervisorNode } from './nodes/supervisor-node';
import { createDefaultEdgeConditions, reviewerEdgeCondition, testerEdgeCondition, supervisorEdgeCondition } from './edges';

export type SubgraphType = 'analyze' | 'plan' | 'execute' | 'review' | 'deploy';

export interface SubgraphDefinition {
  type: SubgraphType;
  nodes: LangGraphAgentRole[];
  agent: LangGraphAgent;
}

/**
 * Analyze subgraph: analyst → architect
 * Purpose: Understand requirements and design architecture
 */
export function createAnalyzeSubgraph(): LangGraphAgent {
  const agent = createLangGraphAgent({ maxIterations: 3, nodeTimeout: 30000, maxRetries: 2 });

  agent.addNode('analyst', createAnalystNode());
  agent.addNode('architect', createArchitectNode());

  agent.addConditionalEdge('analyst', () => 'architect');
  agent.addConditionalEdge('architect', () => '__end__');

  agent.setEntryPoint('analyst');
  return agent;
}

/**
 * Plan subgraph: architect → programmer
 * Purpose: Design solution and plan implementation
 */
export function createPlanSubgraph(): LangGraphAgent {
  const agent = createLangGraphAgent({ maxIterations: 3, nodeTimeout: 30000, maxRetries: 2 });

  agent.addNode('architect', createArchitectNode());
  agent.addNode('programmer', createProgrammerNode());

  agent.addConditionalEdge('architect', () => 'programmer');
  agent.addConditionalEdge('programmer', () => '__end__');

  agent.setEntryPoint('architect');
  return agent;
}

/**
 * Execute subgraph: programmer → reviewer → tester → devops
 * Purpose: Implement, review, test, and prepare deployment
 */
export function createExecuteSubgraph(): LangGraphAgent {
  const agent = createLangGraphAgent({ maxIterations: 5, nodeTimeout: 30000, maxRetries: 3 });

  agent.addNode('programmer', createProgrammerNode());
  agent.addNode('reviewer', createReviewerNode());
  agent.addNode('tester', createTesterNode());
  agent.addNode('devops', createDevOpsNode());

  agent.addConditionalEdge('programmer', () => 'reviewer');
  agent.addConditionalEdge('reviewer', reviewerEdgeCondition);
  agent.addConditionalEdge('tester', testerEdgeCondition);
  agent.addConditionalEdge('devops', () => '__end__');

  agent.setEntryPoint('programmer');
  return agent;
}

/**
 * Review subgraph: reviewer + tester (parallel) → programmer (if errors)
 * Purpose: Review and test code in parallel, with feedback loop
 */
export function createReviewSubgraph(): LangGraphAgent {
  const agent = createLangGraphAgent({ maxIterations: 5, nodeTimeout: 30000, maxRetries: 3 });

  agent.addNode('reviewer', createReviewerNode());
  agent.addNode('tester', createTesterNode());
  agent.addNode('programmer', createProgrammerNode());

  agent.addConditionalEdge('reviewer', reviewerEdgeCondition);
  agent.addConditionalEdge('tester', testerEdgeCondition);

  agent.setEntryPoint('reviewer');
  return agent;
}

/**
 * Deploy subgraph: devops → supervisor
 * Purpose: Finalize deployment and supervision sign-off
 */
export function createDeploySubgraph(): LangGraphAgent {
  const agent = createLangGraphAgent({ maxIterations: 3, nodeTimeout: 30000, maxRetries: 2 });

  agent.addNode('devops', createDevOpsNode());
  agent.addNode('supervisor', createSupervisorNode());

  agent.addConditionalEdge('devops', () => 'supervisor');
  agent.addConditionalEdge('supervisor', supervisorEdgeCondition);

  agent.setEntryPoint('devops');
  return agent;
}

/**
 * Full pipeline using subgraphs: analyze → plan → execute
 */
export function createSubgraphPipeline(): LangGraphAgent {
  const analyzeSubgraph = createAnalyzeSubgraph();
  const planSubgraph = createPlanSubgraph();
  const executeSubgraph = createExecuteSubgraph();
  const _deploySubgraph = createDeploySubgraph();

  const pipeline = createLangGraphAgent({ maxIterations: 15, nodeTimeout: 60000, maxRetries: 3 });

  pipeline.addNode('analyst', async (state: LangGraphStateAnnotation) => {
    const result = await analyzeSubgraph.invoke(state.input);
    return result.finalState;
  });

  pipeline.addNode('architect', async (state: LangGraphStateAnnotation) => {
    const result = await planSubgraph.invoke(state.input);
    return result.finalState;
  });

  pipeline.addNode('programmer', async (state: LangGraphStateAnnotation) => {
    const result = await executeSubgraph.invoke(state.input);
    return result.finalState;
  });

  pipeline.addNode('supervisor', createSupervisorNode());

  pipeline.addConditionalEdge('analyst', () => 'architect');
  pipeline.addConditionalEdge('architect', () => 'programmer');
  pipeline.addConditionalEdge('programmer', () => 'supervisor');
  pipeline.addConditionalEdge('supervisor', supervisorEdgeCondition);

  pipeline.setEntryPoint('analyst');
  return pipeline;
}

export function createSubgraph(type: SubgraphType): LangGraphAgent {
  switch (type) {
    case 'analyze': return createAnalyzeSubgraph();
    case 'plan': return createPlanSubgraph();
    case 'execute': return createExecuteSubgraph();
    case 'review': return createReviewSubgraph();
    case 'deploy': return createDeploySubgraph();
  }
}

export function getAvailableSubgraphs(): SubgraphDefinition[] {
  return [
    { type: 'analyze', nodes: ['analyst', 'architect'], agent: createAnalyzeSubgraph() },
    { type: 'plan', nodes: ['architect', 'programmer'], agent: createPlanSubgraph() },
    { type: 'execute', nodes: ['programmer', 'reviewer', 'tester', 'devops'], agent: createExecuteSubgraph() },
    { type: 'review', nodes: ['reviewer', 'tester', 'programmer'], agent: createReviewSubgraph() },
    { type: 'deploy', nodes: ['devops', 'supervisor'], agent: createDeploySubgraph() },
  ];
}
