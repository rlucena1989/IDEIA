import type { OperationalContext, ContextSnapshot } from '../context-types';

describe('OperationalContext type', () => {
  const now = new Date().toISOString();

  it('constructs a valid operational context', () => {
    const ctx: OperationalContext = {
      contextId: 'ctx-001',
      name: 'main-product',
      type: 'product',
      status: 'active',
      priority: 1,
      source: 'user',
      updatedAt: now,
      createdAt: now,
      tags: ['important'],
      dependencies: ['core'],
      summary: 'Main product context',
    };
    expect(ctx.contextId).toBe('ctx-001');
    expect(ctx.type).toBe('product');
    expect(ctx.status).toBe('active');
  });

  it('accepts all type variants', () => {
    const types: OperationalContext['type'][] = ['product', 'workspace', 'module', 'extension', 'generation', 'governance'];
    for (const type of types) {
      const ctx: OperationalContext = {
        contextId: 'x', name: 'x', type, status: 'active',
        priority: 1, source: 's', updatedAt: now, createdAt: now,
        tags: [], dependencies: [], summary: '',
      };
      expect(ctx.type).toBe(type);
    }
  });

  it('accepts all status variants', () => {
    const statuses: OperationalContext['status'][] = ['active', 'idle', 'blocked', 'archived'];
    for (const status of statuses) {
      const ctx: OperationalContext = {
        contextId: 'x', name: 'x', type: 'product', status,
        priority: 1, source: 's', updatedAt: now, createdAt: now,
        tags: [], dependencies: [], summary: '',
      };
      expect(ctx.status).toBe(status);
    }
  });
});

describe('ContextSnapshot type', () => {
  it('constructs a valid snapshot', () => {
    const snap: ContextSnapshot = {
      contextId: 'ctx-001',
      version: '1.0.0',
      stateRef: 'snap-abc123',
      generatedAt: new Date().toISOString(),
    };
    expect(snap.contextId).toBe('ctx-001');
    expect(snap.version).toBe('1.0.0');
  });
});
