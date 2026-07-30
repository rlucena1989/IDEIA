import { createLangGraphAgent, createAnalystNode, createArchitectNode, createProgrammerNode, createReviewerNode, createTesterNode, createDevOpsNode, createSupervisorNode, createDefaultEdgeConditions } from '../src';
import { createLogger } from '@ideia/logger';
const logger = createLogger('simple-pipeline');

async function runSimplePipeline() {
  const agent = createLangGraphAgent({
    maxIterations: 10,
    nodeTimeout: 30000,
    maxRetries: 3,
  });

  agent.addNode('analyst', createAnalystNode());
  agent.addNode('architect', createArchitectNode());
  agent.addNode('programmer', createProgrammerNode());
  agent.addNode('reviewer', createReviewerNode());
  agent.addNode('tester', createTesterNode());
  agent.addNode('devops', createDevOpsNode());
  agent.addNode('supervisor', createSupervisorNode());

  const conditions = createDefaultEdgeConditions();
  for (const [from, condition] of Object.entries(conditions)) {
    agent.addConditionalEdge(from, condition);
  }

  agent.setEntryPoint('analyst');

  const result = await agent.invoke('Create a REST API for user management');

  logger.info('=== Pipeline Complete ===');
  logger.info(`Input: ${result.finalState.input}`);
  logger.info(`Completed: ${result.finalState.completed}`);
  logger.info(`Errors: ${result.finalState.errors.length}`);
  logger.info(`Nodes executed: ${result.summary.totalNodes}`);
  logger.info(`Duration: ${result.summary.totalDurationMs}ms`);
  logger.info(`Artifacts: ${result.finalState.artifacts.length}`);
  logger.info('Timing:');
  for (const t of result.summary.timing) {
    logger.info(`  ${t.role}: ${t.status} (${t.durationMs}ms, ${t.attempts} attempts)`);
  }
}

runSimplePipeline().catch(logger.error);
