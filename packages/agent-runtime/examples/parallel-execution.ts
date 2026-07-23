import {
  createLangGraphAgent,
  createAnalystNode,
  createArchitectNode,
  createProgrammerNode,
  createReviewerTesterParallelNode,
  createDefaultEdgeConditions,
} from '../src';
import { parallelReviewerTesterEdgeCondition } from '../src/edges';

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

  console.log('=== Parallel Execution Example ===');
  console.log('Input:', result.finalState.input);
  console.log('Completed:', result.finalState.completed);
  console.log('Total duration:', duration, 'ms');
  console.log('Nodes executed:', result.summary.totalNodes);
  console.log('Timing:');
  for (const t of result.summary.timing) {
    console.log(`  ${t.role}: ${t.status} (${t.durationMs}ms)`);
  }
  console.log('Outputs:', Object.keys(result.finalState.outputs));
}

runParallelPipeline().catch(console.error);
