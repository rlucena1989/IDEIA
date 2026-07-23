import { createSubgraphPipeline, getAvailableSubgraphs } from '../src/subgraphs';
import { createLangGraphAgent } from '../src';
import { createAnalystNode, createArchitectNode, createProgrammerNode, createSupervisorNode } from '../src/nodes';

async function runSubgraphPipeline() {
  const pipeline = createSubgraphPipeline();

  console.log('=== Subgraph Pipeline ===');
  const available = getAvailableSubgraphs();
  console.log('Available subgraphs:', available.map(s => `${s.type} (${s.nodes.join(', ')})`).join(', '));

  const result = await pipeline.invoke('Design and implement a microservices architecture');

  console.log('Input:', result.finalState.input);
  console.log('Completed:', result.finalState.completed);
  console.log('Nodes executed:', result.summary.totalNodes);
  console.log('Errors:', result.finalState.errors);
  console.log('Duration:', result.summary.totalDurationMs, 'ms');
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

  console.log('\n=== Custom Subgraph Agent ===');
  const result = await agent.invoke('Build a CLI tool');
  console.log('Input:', result.finalState.input);
  console.log('Completed:', result.finalState.completed);
  console.log('Duration:', result.summary.totalDurationMs, 'ms');
  console.log('Artifacts:', result.finalState.artifacts.length);
}

Promise.all([runSubgraphPipeline(), runCustomSubgraphAgent()]).catch(console.error);
