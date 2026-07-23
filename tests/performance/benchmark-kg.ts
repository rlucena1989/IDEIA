import { KnowledgeGraph } from '../../packages/memory-store/src/knowledge-graph';

async function benchmarkKnowledgeGraph() {
  const DEPTHS = [1, 5, 10, 20];
  const CHAIN_LENGTH = 500;

  console.log('\n=== KnowledgeGraph Traversal Benchmark ===\n');

  const kg = new KnowledgeGraph();

  const nodeIds: string[] = [];
  for (let i = 0; i < CHAIN_LENGTH; i++) {
    const id = kg.addNode({ type: 'module', name: `node-${i}`, properties: { index: i } });
    nodeIds.push(id);
  }

  for (let i = 0; i < CHAIN_LENGTH - 1; i++) {
    kg.addEdge({ source: nodeIds[i], target: nodeIds[i + 1], relation: 'depends_on' });
  }

  const stats = kg.getStats();
  console.log(`Graph: ${stats.nodes} nodes, ${stats.edges} edges, density ${stats.density.toFixed(6)}\n`);

  const results: Array<{ depth: number; traversalTimeMs: number; nodesVisited: number }> = [];

  for (const depth of DEPTHS) {
    const start = Date.now();
    const result = kg.traverse(nodeIds[0], undefined, depth);
    const elapsed = Date.now() - start;

    results.push({ depth, traversalTimeMs: elapsed, nodesVisited: result.length });
    console.log(`  depth ${String(depth).padStart(2)} → ${String(elapsed).padStart(4)}ms  ${String(result.length).padStart(3)} nodes visited`);
  }

  console.log('\n--- Summary ---');
  console.table(results);
}

benchmarkKnowledgeGraph().catch(console.error);
