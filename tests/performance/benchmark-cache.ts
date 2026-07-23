import { MemoryCache } from '../../packages/cache/src/memory-cache';

async function benchmarkCache() {
  const counts = [100, 1000, 10000, 50000];

  console.log('\n=== MemoryCache Throughput Benchmark ===\n');

  for (const count of counts) {
    const c = new MemoryCache();

    const writeStart = Date.now();
    for (let i = 0; i < count; i++) {
      await c.set(`key-${i}`, { index: i, data: 'x'.repeat(100) });
    }
    const writeTime = Date.now() - writeStart;
    const writeOps = Math.round(count / (writeTime / 1000));

    const readStart = Date.now();
    for (let i = 0; i < count; i++) {
      await c.get(`key-${i}`);
    }
    const readTime = Date.now() - readStart;
    const readOps = Math.round(count / (readTime / 1000));

    const mixedStart = Date.now();
    for (let i = 0; i < count; i++) {
      if (i % 3 === 0) await c.set(`mix-${i}`, i);
      else if (i % 3 === 1) await c.get(`key-${i % 100}`);
      else await c.has(`key-${i % 100}`);
    }
    const mixedTime = Date.now() - mixedStart;
    const mixedOps = Math.round(count / (mixedTime / 1000));

    console.log(`  ${String(count).padStart(5)} entries:`);
    console.log(`    Write: ${String(writeTime).padStart(6)}ms  ${String(writeOps).padStart(10)}/s`);
    console.log(`    Read:  ${String(readTime).padStart(6)}ms  ${String(readOps).padStart(10)}/s`);
    console.log(`    Mixed: ${String(mixedTime).padStart(6)}ms  ${String(mixedOps).padStart(10)}/s`);

    const stats = await c.stats();
    console.log(`    Stats: ${stats.size} entries, hitRate ${(stats.hitRate * 100).toFixed(1)}%`);
    console.log('');
  }
}

benchmarkCache().catch(console.error);
