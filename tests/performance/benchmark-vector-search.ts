import { VectorSearch, SearchResult } from '../../packages/memory-store/src/vector-search';

function randomVector(dims: number): number[] {
  const v = new Array(dims);
  for (let i = 0; i < dims; i++) v[i] = Math.random() * 2 - 1;
  return v;
}

async function benchmarkVectorSearch() {
  const DIMS = 256;
  const DATASETS = [10, 100, 1000, 5000];

  console.log('\n=== VectorSearch Latency Benchmark ===\n');
  console.log(`Dimensions: ${DIMS}\n`);

  const results: Array<{ datasetSize: number; searchTimeMs: number; topResults: number; avgScore: string }> = [];

  for (const size of DATASETS) {
    const vs = new VectorSearch(DIMS);

    for (let i = 0; i < size; i++) {
      vs.add(`item-${i}`, { index: i }, randomVector(DIMS));
    }

    const query = randomVector(DIMS);

    const start = Date.now();
    const searchResults: SearchResult[] = vs.search(query, 5);
    const elapsed = Date.now() - start;

    const avgScore = searchResults.length > 0
      ? (searchResults.reduce((s, r) => s + r.score, 0) / searchResults.length).toFixed(4)
      : '0.0000';

    results.push({ datasetSize: size, searchTimeMs: elapsed, topResults: searchResults.length, avgScore });
    console.log(`  ${String(size).padStart(5)} vectors → ${String(elapsed).padStart(4)}ms  top ${searchResults.length} results  avg score ${avgScore}`);
  }

  console.log('\n--- Summary ---');
  console.table(results);
}

benchmarkVectorSearch().catch(console.error);
