import { Bench } from 'tinybench';
import { AuditTrail } from '../../packages/audit-trail/src/audit-trail';
import { mkdtempSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

export function auditTrailBench(bench: Bench) {
  const tmpDir = mkdtempSync(join(tmpdir(), 'bench-audit-'));
  const trailPath = join(tmpDir, 'audit.jsonl');
  const trail = new AuditTrail(trailPath);

  bench
    .add('append single event', () => {
      trail.append({ actor: 'ai', eventType: 'chat.run', target: '/test.ts', decision: 'auto', result: 'success' });
    })
    .add('append 100 events', () => {
      for (let i = 0; i < 100; i++) {
        trail.append({ actor: 'ai', eventType: 'chat.run', target: `/test-${i}.ts`, decision: 'auto', result: 'success' });
      }
    })
    .add('load all events', () => {
      trail.load();
    })
    .add('verify chain integrity', () => {
      trail.verifyChain();
    });

  // Cleanup after bench completes
  const origWarmup = bench.warmup;
  bench.warmup = async () => {
    await origWarmup?.call(bench);
    rmSync(tmpDir, { recursive: true, force: true });
  };
}
