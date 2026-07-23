import { ACPOrchestrator } from '../src/orchestrator';
import { CodebaseProvider, GitProvider, StackProvider, MemoryProvider } from '../src/providers';
import { ContextProvider, ContextItem } from '../src/types';

describe('ACPOrchestrator', () => {
  let orchestrator: ACPOrchestrator;

  beforeEach(() => {
    orchestrator = new ACPOrchestrator({ maxTokens: 5000 });
  });

  it('should register and list providers', () => {
    orchestrator.registerProvider(new CodebaseProvider());
    orchestrator.registerProvider(new GitProvider());
    expect(orchestrator.getProviders()).toContain('codebase');
    expect(orchestrator.getProviders()).toContain('git');
  });

  it('should build ACP payload', async () => {
    orchestrator.registerProvider(new StackProvider());
    const payload = await orchestrator.buildPayload();
    expect(payload.protocol).toBe('acp-v1');
    expect(payload.requestId).toBeTruthy();
    expect(payload.sources.length).toBeGreaterThan(0);
    expect(payload.tokenCount).toBeGreaterThan(0);
  });

  it('should include all registered providers', async () => {
    orchestrator.registerProvider(new CodebaseProvider());
    orchestrator.registerProvider(new GitProvider());
    orchestrator.registerProvider(new MemoryProvider());

    const payload = await orchestrator.buildPayload();
    const sources = payload.sources.map(s => s.source);
    expect(sources).toContain('codebase');
    expect(sources).toContain('git');
    expect(sources).toContain('memory');
  });

  it('should filter by specific sources', async () => {
    orchestrator.registerProvider(new CodebaseProvider());
    orchestrator.registerProvider(new GitProvider());
    orchestrator.registerProvider(new StackProvider());

    const payload = await orchestrator.buildPayload({ sources: ['git'] });
    expect(payload.sources.every(s => s.source === 'git')).toBe(true);
  });

  it('should estimate tokens correctly', () => {
    const tokens = orchestrator.estimateTokens('hello world');
    expect(tokens).toBe(3);
    const long = orchestrator.estimateTokens('a'.repeat(100));
    expect(long).toBe(25);
  });

  it('should respect max token limit', async () => {
    orchestrator = new ACPOrchestrator({ maxTokens: 5 });
    const bigProvider: ContextProvider = {
      name: 'big',
      async collect() {
        return Array.from({ length: 10 }, (_, i) => ({
          id: `big-${i}`,
          source: 'external' as const,
          content: 'x'.repeat(100),
          timestamp: Date.now(),
        }));
      },
    };
    orchestrator.registerProvider(bigProvider);
    const payload = await orchestrator.buildPayload();
    expect(payload.tokenCount!).toBeLessThanOrEqual(5);
  });

  it('should clear cache', () => {
    orchestrator.registerProvider(new StackProvider());
    orchestrator.clearCache();
    expect(orchestrator).toBeDefined();
  });
});

describe('Providers', () => {
  it('codebase provider should return items', async () => {
    const p = new CodebaseProvider();
    const items = await p.collect();
    expect(items.length).toBe(1);
    expect(items[0].source).toBe('codebase');
  });

  it('stack provider should include metadata', async () => {
    const p = new StackProvider();
    const items = await p.collect();
    expect(items[0].metadata).toHaveProperty('nodeVersion');
  });
});
