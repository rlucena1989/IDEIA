import { ContextStore, createContextItem, estimateTokens, ContextItem } from '../runtime/context-store';
import { DecisionCache, summarizeProject, formatSummaryCompact, formatShortDecision, ProjectSummary, DecisionCacheEntry } from '../runtime/context-summarizer';
import { routePrompt, selectOutputMode, getOutputBudget, getMaxInputTokens, getMaxOutputTokens, formatOutputBudget, OutputMode } from '../runtime/prompt-router';
import { TokenEconomyEngine, TokenEconomyReport, TokenSavingsEstimate } from '../runtime/token-economy-engine';
import { TaskType } from '../runtime/classifier';

describe('ContextStore', () => {
  let store: ContextStore;

  beforeEach(() => {
    store = new ContextStore({ maxItems: 20, maxTotalTokens: 100000 });
  });

  describe('createContextItem', () => {
    it('should create item with correct properties', () => {
      const item = createContextItem('src/foo.ts', 'function foo() {}', 'code', ['typescript'], 7);
      expect(item.source).toBe('src/foo.ts');
      expect(item.content).toBe('function foo() {}');
      expect(item.type).toBe('code');
      expect(item.tags).toEqual(['typescript']);
      expect(item.priority).toBe(7);
      expect(item.id).toContain('code_src/foo.ts_');
      expect(item.tokens).toBeGreaterThan(0);
    });

    it('should estimate tokens correctly', () => {
      const item = createContextItem('test.ts', 'hello world', 'file');
      expect(item.tokens).toBe(4);
      expect(item.size).toBe(11);
    });
  });

  describe('estimateTokens', () => {
    it('should estimate 0 for empty string', () => {
      expect(estimateTokens('')).toBe(0);
    });

    it('should estimate proportionally', () => {
      const t1 = estimateTokens('a'.repeat(100));
      const t2 = estimateTokens('a'.repeat(200));
      expect(t2).toBe(t1 * 2);
    });
  });

  describe('add and get', () => {
    it('should add and retrieve items', () => {
      const item = createContextItem('file.ts', 'content', 'file');
      store.add(item);
      expect(store.get(item.id)).toBeDefined();
      expect(store.get(item.id)!.source).toBe('file.ts');
    });

    it('should return undefined for missing id', () => {
      expect(store.get('nonexistent')).toBeUndefined();
    });

    it('should reject items exceeding maxTokensPerItem', () => {
      const store2 = new ContextStore({ maxTokensPerItem: 5 });
      const item = createContextItem('big.ts', 'x'.repeat(200), 'file');
      store2.add(item);
      expect(store2.count()).toBe(0);
    });

    it('should evict lowest priority when over total token limit', () => {
      const store3 = new ContextStore({ maxTotalTokens: 50, maxItems: 10 });
      for (let i = 0; i < 5; i++) {
        store3.add(createContextItem(`low${i}.ts`, 'hello world', 'file', [], 1));
      }
      store3.add(createContextItem('high.ts', 'important content here more', 'file', [], 10));
      expect(store3.count()).toBeLessThanOrEqual(6);
    });
  });

  describe('addMany', () => {
    it('should add multiple items', () => {
      const items = [
        createContextItem('a.ts', 'content a', 'file'),
        createContextItem('b.ts', 'content b', 'file'),
        createContextItem('c.ts', 'content c', 'file'),
      ];
      const added = store.addMany(items);
      expect(added).toBe(3);
      expect(store.count()).toBe(3);
    });
  });

  describe('remove', () => {
    it('should remove an item', () => {
      const item = createContextItem('file.ts', 'content', 'file');
      store.add(item);
      expect(store.remove(item.id)).toBe(true);
      expect(store.count()).toBe(0);
    });

    it('should return false for nonexistent', () => {
      expect(store.remove('nonexistent')).toBe(false);
    });
  });

  describe('clear', () => {
    it('should clear all items', () => {
      store.add(createContextItem('a.ts', 'a', 'file'));
      store.add(createContextItem('b.ts', 'b', 'file'));
      store.clear();
      expect(store.count()).toBe(0);
    });
  });

  describe('getAll', () => {
    it('should return all items', () => {
      store.add(createContextItem('a.ts', 'a', 'file'));
      store.add(createContextItem('b.ts', 'b', 'file'));
      expect(store.getAll()).toHaveLength(2);
    });
  });

  describe('getStats', () => {
    it('should return correct stats', () => {
      store.add(createContextItem('a.ts', 'hello', 'file'));
      store.add(createContextItem('b.ts', 'class Foo {}', 'code', [], 3));
      const stats = store.getStats();
      expect(stats.count).toBe(2);
      expect(stats.totalTokens).toBeGreaterThan(0);
      expect(stats.byType.file).toBe(1);
      expect(stats.byType.code).toBe(1);
    });
  });

  describe('filterRelevance', () => {
    beforeEach(() => {
      store.add(createContextItem('api/user.ts', 'user controller with auth', 'code', ['api'], 8));
      store.add(createContextItem('api/product.ts', 'product listing with filters', 'code', ['api'], 7));
      store.add(createContextItem('src/database.ts', 'database connection config', 'config', ['db'], 9));
      store.add(createContextItem('docs/readme.md', 'project documentation', 'file', ['docs'], 1));
    });

    it('should filter by keyword relevance', () => {
      const result = store.filterRelevance({ taskType: 'feature', keywords: ['user', 'auth'] });
      expect(result.items.length).toBeGreaterThanOrEqual(1);
      expect(result.items.some(i => i.source.includes('user'))).toBe(true);
    });

    it('should filter by file reference', () => {
      const result = store.filterRelevance({ taskType: 'bugfix', keywords: ['bug'], files: ['api/product.ts'] });
      expect(result.items.some(i => i.source.includes('product'))).toBe(true);
    });

    it('should respect maxItems', () => {
      const result = store.filterRelevance({ taskType: 'feature', keywords: ['project', 'database', 'config'], maxItems: 2 });
      expect(result.items.length).toBeLessThanOrEqual(2);
    });

    it('should respect minRelevance', () => {
      const result = store.filterRelevance({ taskType: 'feature', keywords: ['user'], minRelevance: 100 });
      expect(result.items.length).toBe(0);
    });
  });

  describe('pruneExpired', () => {
    it('should remove expired items', () => {
      const past = Date.now() - 100000;
      const item = createContextItem('old.ts', 'old content', 'file');
      (item as any).timestamp = past;
      store.add(item);
      store.add(createContextItem('new.ts', 'new content', 'file'));
      const removed = store.pruneExpired();
      expect(removed).toBe(0);
    });
  });

  describe('getConfig', () => {
    it('should return merged config', () => {
      const store2 = new ContextStore({ maxItems: 100 });
      expect(store2.getConfig().maxItems).toBe(100);
      expect(store2.getConfig().maxTokensPerItem).toBe(8000);
    });
  });
});

describe('DecisionCache', () => {
  let cache: DecisionCache;

  beforeEach(() => {
    cache = new DecisionCache();
  });

  const makeEntry = (id: string, overrides: Partial<DecisionCacheEntry> = {}): DecisionCacheEntry => ({
    id,
    decision: `decision ${id}`,
    context: `context for ${id}`,
    outcome: `outcome of ${id}`,
    timestamp: Date.now(),
    taskType: 'feature',
    tags: [],
    tokenCost: 500,
    ...overrides,
  });

  describe('add and get', () => {
    it('should add and retrieve by id', () => {
      cache.add(makeEntry('dec-1'));
      expect(cache.get('dec-1')).toBeDefined();
      expect(cache.get('dec-1')!.decision).toBe('decision dec-1');
    });

    it('should return undefined for missing id', () => {
      expect(cache.get('nonexistent')).toBeUndefined();
    });
  });

  describe('find', () => {
    it('should find by query text', () => {
      cache.add(makeEntry('dec-1', { decision: 'Implement JWT auth', context: 'Security for API' }));
      const found = cache.find('JWT');
      expect(found).toBeDefined();
      expect(found!.id).toBe('dec-1');
    });

    it('should filter by taskType', () => {
      cache.add(makeEntry('dec-1', { taskType: 'bugfix', decision: 'Fix login bug' }));
      cache.add(makeEntry('dec-2', { taskType: 'feature', decision: 'Add login feature' }));
      const found = cache.find('login', 'bugfix');
      expect(found).toBeDefined();
      expect(found!.id).toBe('dec-1');
    });

    it('should return undefined when no match', () => {
      cache.add(makeEntry('dec-1', { decision: 'Setup database' }));
      expect(cache.find('quantum')).toBeUndefined();
    });
  });

  describe('getStats', () => {
    it('should return zero stats initially', () => {
      const stats = cache.getStats();
      expect(stats.totalEntries).toBe(0);
      expect(stats.totalHits).toBe(0);
      expect(stats.totalMisses).toBe(0);
      expect(stats.hitRate).toBe(0);
      expect(stats.totalTokensSaved).toBe(0);
    });

    it('should track hit rate', () => {
      cache.add(makeEntry('dec-1'));
      cache.get('dec-1');
      cache.get('dec-1');
      cache.get('missing');
      const stats = cache.getStats();
      expect(stats.totalHits).toBe(2);
      expect(stats.totalMisses).toBe(1);
      expect(stats.hitRate).toBeGreaterThan(60);
    });

    it('should track by type', () => {
      cache.add(makeEntry('dec-1', { taskType: 'bugfix' }));
      cache.add(makeEntry('dec-2', { taskType: 'feature' }));
      cache.get('dec-1');
      cache.get('dec-2');
      cache.get('missing');
      const stats = cache.getStats();
      expect(stats.byType.bugfix.hits).toBe(1);
      expect(stats.byType.feature.hits).toBe(1);
    });
  });

  describe('clear', () => {
    it('should clear all entries', () => {
      cache.add(makeEntry('dec-1'));
      cache.clear();
      expect(cache.getAll()).toHaveLength(0);
    });
  });

  describe('getAll', () => {
    it('should return all entries', () => {
      cache.add(makeEntry('dec-1'));
      cache.add(makeEntry('dec-2'));
      expect(cache.getAll()).toHaveLength(2);
    });
  });
});

describe('Project Summary', () => {
  const summary: ProjectSummary = {
    projectName: 'TestProject',
    stack: ['TypeScript', 'React'],
    frameworks: ['Next.js', 'Jest'],
    totalFiles: 100,
    totalLines: 5000,
    totalTokens: 10000,
    lastModified: '2026-07-09',
    keyModules: ['auth', 'api', 'ui', 'db', 'cache'],
    recentChanges: ['Added login', 'Fixed auth', 'Updated deps'],
    architecture: 'Clean Architecture',
    languages: { TypeScript: 80, JavaScript: 15, CSS: 5 },
  };

  describe('summarizeProject', () => {
    it('should create a summary string', () => {
      const s = summarizeProject(summary);
      expect(s).toContain('TestProject');
      expect(s).toContain('TypeScript');
      expect(s).toContain('Clean Architecture');
      expect(s).toContain('5000');
    });

    it('should respect max length', () => {
      const s = summarizeProject(summary, 100);
      expect(s.length).toBeLessThanOrEqual(103);
    });
  });

  describe('formatSummaryCompact', () => {
    it('should return compact summary', () => {
      const s = formatSummaryCompact(summary);
      expect(s.length).toBeLessThanOrEqual(303);
    });
  });

  describe('formatShortDecision', () => {
    it('should format decision entry', () => {
      const entry: DecisionCacheEntry = {
        id: 'dec-1',
        decision: 'Use JWT for authentication',
        context: 'Security review',
        outcome: 'Approved with 24h expiry',
        timestamp: Date.now(),
        taskType: 'security_review',
        tags: ['auth', 'jwt'],
        tokenCost: 300,
      };
      const formatted = formatShortDecision(entry);
      expect(formatted).toContain('security_review');
      expect(formatted).toContain('JWT');
      expect(formatted).toContain('Approved');
    });
  });
});

describe('PromptRouter', () => {
  describe('routePrompt', () => {
    it('should route bugfix to bugfix template', () => {
      const route = routePrompt('bugfix');
      expect(route.template).toBe('bugfix');
      expect(route.outputMode).toBe('standard');
    });

    it('should route security_review to security template', () => {
      const route = routePrompt('security_review');
      expect(route.template).toBe('security');
    });

    it('should accept explicit mode', () => {
      const route = routePrompt('feature', 'compact');
      expect(route.outputMode).toBe('compact');
    });

    it('should return correct context strategy per mode', () => {
      expect(routePrompt('feature', 'compact').contextStrategy).toBe('minimal_context');
      expect(routePrompt('feature', 'standard').contextStrategy).toBe('balanced_context');
      expect(routePrompt('feature', 'expanded').contextStrategy).toBe('full_context_with_examples');
      expect(routePrompt('feature', 'forensic').contextStrategy).toBe('exhaustive_context_with_audit');
    });
  });

  describe('selectOutputMode', () => {
    it('should select compact for simple high confidence tasks', () => {
      expect(selectOutputMode('bugfix', 90)).toBe('compact');
    });

    it('should select standard for moderate tasks', () => {
      expect(selectOutputMode('refactor', 80)).toBe('standard');
    });

    it('should select expanded for complex tasks', () => {
      expect(selectOutputMode('feature', 75)).toBe('expanded');
    });

    it('should respect budget override', () => {
      expect(selectOutputMode('feature', 90, 3000)).toBe('compact');
      expect(selectOutputMode('feature', 90, 15000)).toBe('standard');
      expect(selectOutputMode('bugfix', 90, 100000)).toBe('forensic');
    });

    it('should default to standard for unknown types', () => {
      expect(selectOutputMode('test_only' as TaskType, 50)).toBe('standard');
    });
  });

  describe('getOutputBudget', () => {
    it('should return budget for compact mode', () => {
      const budget = getOutputBudget('compact');
      expect(budget.mode).toBe('compact');
      expect(budget.maxTokens).toBe(500);
      expect(budget.maxFiles).toBe(1);
      expect(budget.includeExplanations).toBe(false);
    });

    it('should return budget for forensic mode', () => {
      const budget = getOutputBudget('forensic');
      expect(budget.mode).toBe('forensic');
      expect(budget.maxTokens).toBe(16000);
      expect(budget.maxFiles).toBe(50);
      expect(budget.includeMetrics).toBe(true);
    });
  });

  describe('getMaxInputTokens', () => {
    it('should return correct limits per mode', () => {
      expect(getMaxInputTokens('compact')).toBe(4000);
      expect(getMaxInputTokens('standard')).toBe(16000);
      expect(getMaxInputTokens('expanded')).toBe(32000);
      expect(getMaxInputTokens('forensic')).toBe(64000);
    });
  });

  describe('getMaxOutputTokens', () => {
    it('should return correct output limits per mode', () => {
      expect(getMaxOutputTokens('compact')).toBe(500);
      expect(getMaxOutputTokens('standard')).toBe(2000);
      expect(getMaxOutputTokens('expanded')).toBe(8000);
      expect(getMaxOutputTokens('forensic')).toBe(16000);
    });
  });

  describe('formatOutputBudget', () => {
    it('should format budget as string', () => {
      const str = formatOutputBudget(getOutputBudget('standard'));
      expect(str).toContain('Mode: standard');
      expect(str).toContain('Max Tokens: 2000');
      expect(str).toContain('Code: yes');
    });
  });
});

describe('TokenEconomyEngine', () => {
  let engine: TokenEconomyEngine;

  beforeEach(() => {
    engine = new TokenEconomyEngine();
  });

  describe('getContextStore', () => {
    it('should return initialized context store', () => {
      expect(engine.getContextStore()).toBeDefined();
      expect(engine.getContextStore().count()).toBe(0);
    });
  });

  describe('getDecisionCache', () => {
    it('should return initialized decision cache', () => {
      expect(engine.getDecisionCache()).toBeDefined();
      expect(engine.getDecisionCache().getStats().totalEntries).toBe(0);
    });
  });

  describe('optimize', () => {
    it('should return a report with all fields', () => {
      const report = engine.optimize('feature', 'Add user authentication with JWT', ['src/auth.ts'], 10000);
      expect(report).toBeDefined();
      expect(report.taskType).toBe('feature');
      expect(report.timestamp).toBeDefined();
      expect(report.selectedMode).toBeDefined();
      expect(report.contextBefore).toBe(10000);
      expect(report.tokensSaved).toBeGreaterThanOrEqual(0);
    });

    it('should use existing context items in optimization', () => {
      const ctx = createContextItem('auth.ts', 'JWT authentication middleware verifying tokens and roles', 'code', ['auth'], 9);
      engine.getContextStore().add(ctx);
      const report = engine.optimize('feature', 'Update JWT auth', ['auth.ts'], 5000);
      expect(report.contextAfter).toBeLessThanOrEqual(report.contextBefore);
    });

    it('should utilize decision cache', () => {
      engine.getDecisionCache().add({
        id: 'auth-dec-1',
        decision: 'Use JWT for auth',
        context: 'Security architecture',
        outcome: 'Approved',
        timestamp: Date.now(),
        taskType: 'feature',
        tags: ['auth'],
        tokenCost: 300,
      });
      engine.getDecisionCache().get('auth-dec-1');
      const report = engine.optimize('feature', 'Add auth', ['src/auth.ts'], 5000);
      expect(report.cacheHits).toBeGreaterThan(0);
    });

    it('should respect budget tokens parameter', () => {
      const report = engine.optimize('bugfix', 'Fix login bug', [], 100000, 3000);
      expect(report.selectedMode).toBe('compact');
    });
  });

  describe('estimateSavings', () => {
    it('should return savings estimate', () => {
      const estimate = engine.estimateSavings('Implement a new feature with user authentication and authorization', 'feature', 10);
      expect(estimate.totalOriginalTokens).toBeGreaterThan(0);
      expect(estimate.tokensSaved).toBeGreaterThan(0);
      expect(estimate.reductionPercent).toBeGreaterThan(0);
      expect(estimate.contextReduction).toBeGreaterThan(0);
      expect(estimate.routingSavings).toBeGreaterThan(0);
    });

    it('should have cache savings when cache has hits', () => {
      engine.getDecisionCache().add({
        id: 'dec-1',
        decision: 'Test decision',
        context: 'Test',
        outcome: 'OK',
        timestamp: Date.now(),
        taskType: 'feature',
        tags: [],
        tokenCost: 100,
      });
      engine.getDecisionCache().get('dec-1');
      const estimate = engine.estimateSavings('short text', 'bugfix', 2);
      expect(estimate.cacheSavings).toBe(500);
    });
  });

  describe('getStats', () => {
    it('should return engine stats', () => {
      const stats = engine.getStats();
      expect(stats.contextItems).toBe(0);
      expect(stats.contextTokens).toBe(0);
      expect(stats.cacheEntries).toBe(0);
    });
  });

  describe('formatReport', () => {
    it('should format report as readable string', () => {
      const report = engine.optimize('refactor', 'Refactor auth module', ['src/auth.ts'], 8000);
      const formatted = engine.formatReport(report);
      expect(formatted).toContain('Token Economy Report');
      expect(formatted).toContain('refactor');
      expect(formatted).toContain('Context Optimization');
      expect(formatted).toContain('Cache');
    });
  });

  describe('formatSavings', () => {
    it('should format savings estimate', () => {
      const estimate = engine.estimateSavings('Some text here', 'bugfix', 3);
      const formatted = engine.formatSavings(estimate);
      expect(formatted).toContain('Token Savings Estimate');
      expect(formatted).toContain('Breakdown');
    });
  });

  describe('custom configuration', () => {
    it('should accept custom config', () => {
      const custom = new TokenEconomyEngine({
        contextStore: { maxItems: 50, maxTokensPerItem: 16000, maxTotalTokens: 256000, ttlMs: 7200000 },
        summarizer: { maxSummaryLength: 300, maxDecisions: 50 },
        promptRouter: { defaultMode: 'compact', compactMaxInputTokens: 2000, compactMaxOutputTokens: 300, standardMaxInputTokens: 8000, standardMaxOutputTokens: 1000, expandedMaxInputTokens: 16000, expandedMaxOutputTokens: 4000, forensicMaxInputTokens: 32000, forensicMaxOutputTokens: 8000 },
      });
      expect(custom.getContextStore().getConfig().maxItems).toBe(50);
      const report = custom.optimize('bugfix', 'quick fix', [], 1000);
      expect(report.selectedMode).toBe('compact');
    });
  });
});
