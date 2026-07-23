import { createLangGraphAgent, createAnalystNode, createArchitectNode, createProgrammerNode, createReviewerNode, createTesterNode, createDevOpsNode, createSupervisorNode, createDefaultEdgeConditions } from '../src';

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

  console.log('=== Pipeline Complete ===');
  console.log('Input:', result.finalState.input);
  console.log('Completed:', result.finalState.completed);
  console.log('Errors:', result.finalState.errors.length);
  console.log('Nodes executed:', result.summary.totalNodes);
  console.log('Duration:', result.summary.totalDurationMs, 'ms');
  console.log('Artifacts:', result.finalState.artifacts.length);
  console.log('Timing:');
  for (const t of result.summary.timing) {
    console.log(`  ${t.role}: ${t.status} (${t.durationMs}ms, ${t.attempts} attempts)`);
  }
}

runSimplePipeline().catch(console.error);
