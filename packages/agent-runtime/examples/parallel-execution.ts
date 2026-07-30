import {
  createLangGraphAgent,
  createAnalystNode,
  createArchitectNode,
  createProgrammerNode,
  createReviewerTesterParallelNode,
  createDefaultEdgeConditions,
} from '../src';
import { createLogger } from '@ideia/logger';
import { parallelReviewerTesterEdgeCondition } from '../src/edges';
const logger = createLogger('parallel-execution');

async function runParallelPipeline() {
  const agent = createLangGraphAgent({
    maxIterations: 10,
    nodeTimeout: 30000,
    maxRetries: 3,
    enableParallelExecution: true,
  });

  agent.addNode('analyst', createAnalystNode());
  agent.addNode('architect', createArchitectNode());
  agent.addNode('programmer', createProgrammerNode());
  agent.addNode('parallel_reviewer_tester', createReviewerTesterParallelNode());

  const conditions = createDefaultEdgeConditions();
  for (const [from, condition] of Object.entries(conditions)) {
    agent.addConditionalEdge(from, condition);
  }
  agent.addConditionalEdge('parallel_reviewer_tester', parallelReviewerTesterEdgeCondition);

  agent.setEntryPoint('analyst');

  const start = Date.now();
  const result = await agent.invoke('Build a task management API');
  const duration = Date.now() - start;

  logger.info('=== Parallel Execution Example ===');
  logger.info(`Input: ${result.finalState.input}`);
  logger.info(`Completed: ${result.finalState.completed}`);
  logger.info(`Total duration: ${duration}ms`);
  logger.info(`Nodes executed: ${result.summary.totalNodes}`);
  logger.info('Timing:');
  for (const t of result.summary.timing) {
    logger.info(`  ${t.role}: ${t.status} (${t.durationMs}ms)`);
  }
  logger.info(`Outputs: ${Object.keys(result.finalState.outputs).join(', ')}`);
}

runParallelPipeline().catch(logger.error);
