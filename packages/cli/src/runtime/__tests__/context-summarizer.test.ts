import { describe, it, expect } from '@jest/globals';
import {
  DecisionCache,
  summarizeProject,
  formatSummaryCompact,
  formatShortDecision,
  ProjectSummary,
  DecisionCacheEntry,
  DEFAULT_SUMMARIZER_CONFIG,
} from '../context-summarizer';

const sampleSummary: ProjectSummary = {
  projectName: 'IDEIA',
  stack: ['TypeScript', 'Node.js'],
  frameworks: ['React'],
  totalFiles: 201,
  totalLines: 50000,
  totalTokens: 500000,
  lastModified: new Date().toISOString(),
  keyModules: ['cli', 'core', 'plugin'],
  recentChanges: ['Fixed bug', 'Added feature'],
  architecture: 'Clean Architecture',
  languages: { TypeScript: 150, JavaScript: 30, JSON: 20 },
};

describe('DecisionCache', () => {
  const makeEntry = (id: string, overrides: Partial<DecisionCacheEntry> = {}): DecisionCacheEntry => ({
    id,
    decision: 'test decision',
    context: 'test context',
    outcome: 'success',
    timestamp: Date.now(),
    taskType: 'test',
    tags: [],
    tokenCost: 100,
    ...overrides,
  });

  it('should add and retrieve entries', () => {
    const cache = new DecisionCache();
    cache.add(makeEntry('e1'));
    const entry = cache.get('e1');
    expect(entry).toBeDefined();
    expect(entry!.id).toBe('e1');
  });

  it('should return undefined for unknown id', () => {
    const cache = new DecisionCache();
    expect(cache.get('unknown')).toBeUndefined();
  });

  it('should track hits and misses', () => {
    const cache = new DecisionCache();
    cache.add(makeEntry('e1'));
    cache.get('e1');
    cache.get('e1');
    cache.get('unknown');
    const stats = cache.getStats();
    expect(stats.totalHits).toBe(2);
    expect(stats.totalMisses).toBe(1);
  });

  it('should calculate hit rate correctly', () => {
    const cache = new DecisionCache();
    cache.add(makeEntry('e1'));
    cache.get('e1'); // hit
    cache.get('unknown'); // miss
    expect(cache.getStats().hitRate).toBe(50);
  });

  it('should return 0 hit rate when no lookups', () => {
    const cache = new DecisionCache();
    expect(cache.getStats().hitRate).toBe(0);
  });

  it('should find by query', () => {
    const cache = new DecisionCache();
    cache.add(makeEntry('e1', { decision: 'deploy to production', context: 'production env' }));
    const found = cache.find('production');
    expect(found).toBeDefined();
    expect(found!.id).toBe('e1');
  });

  it('should filter find by taskType', () => {
    const cache = new DecisionCache();
    cache.add(makeEntry('e1', { decision: 'deploy', taskType: 'deploy' }));
    cache.add(makeEntry('e2', { decision: 'deploy', taskType: 'test' }));
    const found = cache.find('deploy', 'test');
    expect(found).toBeDefined();
    expect(found!.taskType).toBe('test');
  });

  it('should track tokens saved', () => {
    const cache = new DecisionCache();
    cache.add(makeEntry('e1'));
    cache.get('e1');
    expect(cache.getStats().totalTokensSaved).toBe(500);
  });

  it('should clear all entries', () => {
    const cache = new DecisionCache();
    cache.add(makeEntry('e1'));
    cache.add(makeEntry('e2'));
    cache.clear();
    expect(cache.getAll()).toHaveLength(0);
  });

  it('should evict oldest when over capacity', () => {
    const cache = new DecisionCache();
    for (let i = 0; i < 110; i++) {
      cache.add(makeEntry(`e${i}`, { timestamp: i }));
    }
    expect(cache.getAll().length).toBeLessThanOrEqual(100);
  });

  it('should track by-type stats', () => {
    const cache = new DecisionCache();
    cache.add(makeEntry('e1', { taskType: 'deploy' }));
    cache.get('e1'); // hit for deploy
    cache.get('e2'); // miss for unknown
    const stats = cache.getStats();
    expect(stats.byType.deploy.hits).toBe(1);
    expect(stats.byType.unknown.misses).toBe(1);
  });
});

describe('summarizeProject', () => {
  it('should include project name', () => {
    const result = summarizeProject(sampleSummary);
    expect(result).toContain('IDEIA');
  });

  it('should include stack info', () => {
    const result = summarizeProject(sampleSummary);
    expect(result).toContain('TypeScript');
  });

  it('should include language breakdown', () => {
    const result = summarizeProject(sampleSummary);
    expect(result).toContain('TypeScript');
  });

  it('should truncate to maxLength', () => {
    const result = summarizeProject(sampleSummary, 50);
    expect(result.length).toBeLessThanOrEqual(53);
    expect(result).toMatch(/\.\.\.$/);
  });

  it('should handle empty optional fields', () => {
    const minimal: ProjectSummary = {
      projectName: 'test',
      stack: [],
      frameworks: [],
      totalFiles: 0,
      totalLines: 0,
      totalTokens: 0,
      lastModified: '',
      keyModules: [],
      recentChanges: [],
      architecture: 'none',
      languages: {},
    };
    const result = summarizeProject(minimal);
    expect(result).toContain('test');
  });
});

describe('formatSummaryCompact', () => {
  it('should produce shorter output', () => {
    const compact = formatSummaryCompact(sampleSummary);
    const normal = summarizeProject(sampleSummary);
    expect(compact.length).toBeLessThanOrEqual(normal.length);
  });
});

describe('formatShortDecision', () => {
  it('should format decision entry', () => {
    const entry: DecisionCacheEntry = {
      id: 'd1', decision: 'Deploy to production', context: '', outcome: 'Success',
      timestamp: 0, taskType: 'deploy', tags: [], tokenCost: 0,
    };
    const result = formatShortDecision(entry);
    expect(result).toContain('[deploy]');
    expect(result).toContain('Deploy to production');
    expect(result).toContain('Success');
  });

  it('should truncate long decision strings', () => {
    const entry: DecisionCacheEntry = {
      id: 'd1', decision: 'x'.repeat(200), context: '', outcome: 'y'.repeat(100),
      timestamp: 0, taskType: 'test', tags: [], tokenCost: 0,
    };
    const result = formatShortDecision(entry);
    expect(result.length).toBeLessThan(200);
  });
});
