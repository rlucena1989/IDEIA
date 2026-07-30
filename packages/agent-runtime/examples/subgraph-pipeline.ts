import { createSubgraphPipeline, getAvailableSubgraphs } from '../src/subgraphs';
import { createLogger } from '@ideia/logger';
import { createLangGraphAgent } from '../src';
import { createAnalystNode, createArchitectNode, createProgrammerNode, createSupervisorNode } from '../src/nodes';
const logger = createLogger('subgraph-pipeline');

async function runSubgraphPipeline() {
  const pipeline = createSubgraphPipeline();

  logger.info('=== Subgraph Pipeline ===');
  const available = getAvailableSubgraphs();
  logger.info('Available subgraphs:', available.map(s => `${s.type} (${s.nodes.join(', ')})`).join(', '));

  const result = await pipeline.invoke('Design and implement a microservices architecture');

  logger.info('Input:', result.finalState.input);
  logger.info('Completed:', result.finalState.completed);
  logger.info('Nodes executed:', result.summary.totalNodes);
  logger.info('Errors:', result.finalState.errors);
  logger.info('Duration:', result.summary.totalDurationMs, 'ms');
}

async function runCustomSubgraphAgent() {
  const agent = createLangGraphAgent({
    maxIterations: 8,
    nodeTimeout: 20000,
    maxRetries: 2,
  });

  agent.addNode('analyst', createAnalystNode());
  agent.addNode('architect', createArchitectNode());
  agent.addNode('programmer', createProgrammerNode());
  agent.addNode('supervisor', createSupervisorNode());

  agent.addConditionalEdge('analyst', () => 'architect');
  agent.addConditionalEdge('architect', () => 'programmer');
  agent.addConditionalEdge('programmer', () => 'supervisor');
  agent.addConditionalEdge('supervisor', () => '__end__');

  agent.setEntryPoint('analyst');

  logger.info('\n=== Custom Subgraph Agent ===');
  const result = await agent.invoke('Build a CLI tool');
  logger.info('Input:', result.finalState.input);
  logger.info('Completed:', result.finalState.completed);
  logger.info('Duration:', result.summary.totalDurationMs, 'ms');
  logger.info('Artifacts:', result.finalState.artifacts.length);
}

Promise.all([runSubgraphPipeline(), runCustomSubgraphAgent()]).catch(logger.error);
