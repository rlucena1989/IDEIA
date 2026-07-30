import { describe, it, expect } from '@jest/globals';
import { PolicyEnforcer } from '../src/policy-enforcer';

describe('concurrency', () => {
  it('handles 10 simultaneous operations', async () => {
    const enforcer = new PolicyEnforcer();
    const operations = Array.from({ length: 10 }, (_, i) => ({
      operation: (i % 2 === 0 ? 'read' : 'write') as 'read' | 'write',
      path: `/project/file-${i}.ts`,
      scope: (i % 3 === 0 ? 'self' : i % 3 === 1 ? 'project' : 'system') as 'self' | 'project' | 'system',
    }));

    const results = await Promise.all(
      operations.map(op =>
        Promise.resolve(enforcer.enforce(op.operation, op.path, op.scope))
      )
    );

    expect(results).toHaveLength(10);
    for (const result of results) {
      expect(result).toHaveProperty('allowed');
      expect(typeof result.allowed).toBe('boolean');
      expect(result).toHaveProperty('reason');
    }
  });

  it('handles concurrent reads without state corruption', async () => {
    const enforcer = new PolicyEnforcer();
    const count = 10;
    const results = await Promise.all(
      Array.from({ length: count }, () =>
        Promise.resolve(enforcer.enforce('read', '/.ideia/config.json', 'self'))
      )
    );

    const allowed = results.filter(r => r.allowed).length;
    expect(allowed).toBe(count);
  });

  it('handles mixed operations concurrently', async () => {
    const enforcer = new PolicyEnforcer();
    const ops = [
      { operation: 'read' as const, path: '/project/a.ts', scope: 'self' as const },
      { operation: 'write' as const, path: '/.ideia/settings.json', scope: 'self' as const },
      { operation: 'read' as const, path: '/node_modules/pkg/index.js', scope: 'system' as const },
      { operation: 'write' as const, path: '/node_modules/pkg/out.js', scope: 'project' as const },
      { operation: 'delete' as const, path: '/.ideia/secret.json', scope: 'project' as const },
    ];

    const results = await Promise.all(
      ops.map(op => Promise.resolve(enforcer.enforce(op.operation, op.path, op.scope)))
    );

    expect(results).toHaveLength(5);
    const allDifferent = new Set(results.map(r => r.reason)).size;
    expect(allDifferent).toBeGreaterThanOrEqual(2);
    expect(results[3].allowed).toBe(false);
    expect(results[4].allowed).toBe(false);
  });
});
