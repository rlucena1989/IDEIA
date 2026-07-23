/**
 * Memory Profiler — Real-time heap analysis for IDEIA processes
 *
 * Usage:
 *   node scripts/memory-profile.js              # Snapshot current process
 *   node scripts/memory-profile.js --watch      # Watch mode (every 5s)
 *   node scripts/memory-profile.js --pid 1234   # Profile another process
 *   node scripts/memory-profile.js --json       # JSON output
 */

import { performance } from 'node:perf_hooks';
import { writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROFILES_DIR = resolve(__dirname, '..', 'memory-profiles');

function formatBytes(bytes) {
  if (bytes >= 1_073_741_824) return `${(bytes / 1_073_741_824).toFixed(2)} GB`;
  if (bytes >= 1_048_576) return `${(bytes / 1_048_576).toFixed(2)} MB`;
  if (bytes >= 1_024) return `${(bytes / 1_024).toFixed(2)} KB`;
  return `${bytes} B`;
}

function snapshot() {
  const mem = process.memoryUsage();
  const cpu = process.cpuUsage();
  const elapsed = process.uptime();

  return {
    timestamp: new Date().toISOString(),
    pid: process.pid,
    uptime: elapsed,
    heap: {
      total: mem.heapTotal,
      used: mem.heapUsed,
      external: mem.external,
      arrayBuffers: mem.arrayBuffers || 0,
      rss: mem.rss,
    },
    cpu: {
      user: cpu.user,
      system: cpu.system,
    },
    eventLoopLag: 0,
  };
}

function printSnapshot(data) {
  const heapPct = ((data.heap.used / data.heap.total) * 100).toFixed(1);
  console.log(`[${data.timestamp}] PID ${data.pid}`);
  console.log(`  Heap:    ${formatBytes(data.heap.used).padStart(10)} / ${formatBytes(data.heap.total).padStart(10)} (${heapPct}%)`);
  console.log(`  RSS:     ${formatBytes(data.heap.rss).padStart(10)}`);
  console.log(`  Ext:     ${formatBytes(data.heap.external).padStart(10)}`);
  console.log(`  CPU:     ${(data.cpu.user / 1e6).toFixed(2)}s user / ${(data.cpu.system / 1e6).toFixed(2)}s sys`);
  console.log(`  Uptime:  ${(data.uptime / 60).toFixed(1)}m`);
}

function saveProfile(data) {
  if (!existsSync(PROFILES_DIR)) mkdirSync(PROFILES_DIR, { recursive: true });
  const file = resolve(PROFILES_DIR, `profile-${data.pid}-${Date.now()}.json`);
  writeFileSync(file, JSON.stringify(data, null, 2));
  return file;
}

async function measureEventLoopLag() {
  return new Promise(resolve => {
    const start = performance.now();
    setImmediate(() => resolve(performance.now() - start));
  });
}

async function run() {
  const args = process.argv.slice(2);
  const isWatch = args.includes('--watch') || args.includes('-w');
  const isJson = args.includes('--json');

  console.log('┌─────────────────────────────────────────────┐');
  console.log('│  IDEIA Memory Profiler                       │');
  console.log(`│  Node: ${process.version.padEnd(34)}│`);
  console.log(`│  PID:  ${process.pid.toString().padEnd(34)}│`);
  console.log('└─────────────────────────────────────────────┘\n');

  if (isWatch) {
    const interval = 5000;
    console.log(`Watch mode: sampling every ${interval / 1000}s\n`);

    const samples = [];
    const maxSamples = 60;

    const timer = setInterval(async () => {
      const data = snapshot();
      data.eventLoopLag = await measureEventLoopLag();
      samples.push(data);
      printSnapshot(data);

      if (data.heap.rss > 500 * 1_048_576) {
        console.log('  ⚠️  RSS > 500MB — possible memory pressure');
      }
      if (data.eventLoopLag > 100) {
        console.log(`  ⚠️  Event loop lag: ${data.eventLoopLag.toFixed(2)}ms`);
      }

      if (samples.length >= maxSamples) {
        clearInterval(timer);
        console.log(`\nDone. ${samples.length} samples collected.`);
        const file = saveProfile({ samples, summary: { total: samples.length, duration: samples.length * interval / 1000 } });
        console.log(`Saved to: ${file}`);
      }
    }, interval);

    process.on('SIGINT', () => {
      clearInterval(timer);
      console.log(`\nInterrupted. ${samples.length} samples collected.`);
      if (samples.length > 0) {
        const file = saveProfile({ samples, summary: { total: samples.length, duration: 'interrupted' } });
        console.log(`Saved to: ${file}`);
      }
      process.exit(0);
    });

  } else {
    const data = snapshot();
    data.eventLoopLag = await measureEventLoopLag();
    printSnapshot(data);

    const file = saveProfile(data);
    console.log(`\nSaved to: ${file}`);

    if (isJson) {
      console.log(JSON.stringify(data, null, 2));
    }

    if (data.heap.rss > 500 * 1_048_576) {
      console.log('\n⚠️  RSS > 500MB — possible memory pressure');
    }
  }
}

run().catch(err => {
  console.error('Profile failed:', err);
  process.exit(1);
});
