import { NeedDeclarer } from '../need-declarer';
import { TokenAllocator } from '../token-allocator';
import { PriorityManager } from '../priority-manager';
import { DynamicRenegotiator } from '../dynamic-renegotiator';
import { BudgetNegotiator } from '../budget-negotiator';
import { ContextSource } from '../types-budget';
import { TaskProfile } from '../types-budget';
import { SourceNeed } from '../types-budget';
import { CompressionLevel } from '../types-budget';

function makeSource(overrides: Partial<ContextSource> & { id: string }): ContextSource {
  return {
    name: overrides.id,
    type: 'document',
    content: 'test content',
    tokenCount: 1000,
    priority: 50,
    isRequired: false,
    ...overrides,
  };
}

function makeProfile(overrides?: Partial<TaskProfile>): TaskProfile {
  return {
    taskType: 'code',
    complexity: 'medium',
    requiredDomains: [],
    maxResponseTokens: 500,
    expectedSteps: 3,
    ...overrides,
  };
}

describe('NeedDeclarer', () => {
  let declarer: NeedDeclarer;
  let profile: TaskProfile;

  beforeEach(() => {
    declarer = new NeedDeclarer();
    profile = makeProfile();
  });

  it('should declare needs from sources', () => {
    const sources: ContextSource[] = [
      makeSource({ id: 'sys', type: 'system', tokenCount: 2000, priority: 100, isRequired: true }),
      makeSource({ id: 'doc1', type: 'document', tokenCount: 5000, priority: 30 }),
    ];

    const needs = declarer.declare(sources, profile);

    expect(needs).toHaveLength(2);
    expect(needs[0].sourceId).toBe('sys');
    expect(needs[0].isRequired).toBe(true);
    expect(needs[1].sourceId).toBe('doc1');
  });

  it('should calculate min tokens based on source type', () => {
    const sources: ContextSource[] = [
      makeSource({ id: 'sys', type: 'system', tokenCount: 1000 }),
      makeSource({ id: 'hist', type: 'history', tokenCount: 1000 }),
      makeSource({ id: 'doc', type: 'document', tokenCount: 1000 }),
      makeSource({ id: 'tool', type: 'tool', tokenCount: 1000 }),
      makeSource({ id: 'mem', type: 'memory', tokenCount: 1000 }),
      makeSource({ id: 'inst', type: 'instruction', tokenCount: 1000 }),
    ];

    const needs = declarer.declare(sources, profile);

    expect(needs[0].minTokens).toBe(500);
    expect(needs[1].minTokens).toBe(100);
    expect(needs[2].minTokens).toBe(50);
    expect(needs[3].minTokens).toBe(150);
    expect(needs[4].minTokens).toBe(100);
    expect(needs[5].minTokens).toBe(300);
  });

  it('should calculate desired tokens using priority and type factor', () => {
    const high = makeSource({ id: 'high', type: 'document', tokenCount: 5000, priority: 90 });
    const low = makeSource({ id: 'low', type: 'document', tokenCount: 5000, priority: 10 });

    const needs = declarer.declare([high, low], profile);

    expect(needs[0].desiredTokens).toBeGreaterThan(needs[1].desiredTokens);
  });

  it('should detect required sources', () => {
    const sources: ContextSource[] = [
      makeSource({ id: 'sys', type: 'system', isRequired: true }),
      makeSource({ id: 'doc', type: 'document' }),
      makeSource({ id: 'inst', type: 'instruction', isRequired: true }),
    ];

    const required = declarer.detectRequiredSources(sources);

    expect(required).toHaveLength(2);
    expect(required.map(s => s.id)).toEqual(['sys', 'inst']);
  });
});

describe('TokenAllocator', () => {
  let allocator: TokenAllocator;

  beforeEach(() => {
    allocator = new TokenAllocator();
  });

  it('should allocate fair share when budget is sufficient', () => {
    const needs: SourceNeed[] = [
      { sourceId: 'a', minTokens: 100, desiredTokens: 2000, priority: 10, urgency: 50, isRequired: false },
      { sourceId: 'b', minTokens: 100, desiredTokens: 2000, priority: 20, urgency: 50, isRequired: false },
    ];

    const allocations = allocator.allocateFair(needs, 2000, 0);

    expect(allocations).toHaveLength(2);
    expect(allocations[0].allocated).toBeGreaterThanOrEqual(100);
    expect(allocations[1].allocated).toBeGreaterThanOrEqual(100);
    expect(allocations[1].allocated).toBeGreaterThan(allocations[0].allocated);
  });

  it('should guarantee minimum per source in fair allocation', () => {
    const needs: SourceNeed[] = [
      { sourceId: 'a', minTokens: 50, desiredTokens: 200, priority: 10, urgency: 50, isRequired: false },
    ];

    const allocations = allocator.allocateFair(needs, 500, 30);

    expect(allocations[0].allocated).toBeGreaterThanOrEqual(50);
  });

  it('should allocate by priority when budget is insufficient', () => {
    const needs: SourceNeed[] = [
      { sourceId: 'high', minTokens: 200, desiredTokens: 2000, priority: 90, urgency: 100, isRequired: false },
      { sourceId: 'low', minTokens: 200, desiredTokens: 2000, priority: 10, urgency: 10, isRequired: false },
    ];

    const allocations = allocator.allocatePriority(needs, 300, 0);

    expect(allocations).toHaveLength(2);
    expect(allocations[0].sourceId).toBe('high');
    expect(allocations[0].allocated).toBeGreaterThan(0);
    expect(allocations[0].isExcluded).toBe(false);
  });

  it('should exclude lowest priority sources when budget is insufficient', () => {
    const needs: SourceNeed[] = [
      { sourceId: 'a', minTokens: 200, desiredTokens: 2000, priority: 90, urgency: 80, isRequired: false },
      { sourceId: 'b', minTokens: 200, desiredTokens: 2000, priority: 50, urgency: 40, isRequired: false },
      { sourceId: 'c', minTokens: 200, desiredTokens: 2000, priority: 10, urgency: 5, isRequired: false },
    ];

    const allocations = allocator.allocatePriority(needs, 250, 0);

    const excluded = allocations.filter(a => a.isExcluded);
    expect(excluded.length).toBeGreaterThan(0);
    expect(allocations[0].isExcluded).toBe(false);
  });

  it('should always allocate to required sources first', () => {
    const needs: SourceNeed[] = [
      { sourceId: 'required', minTokens: 300, desiredTokens: 1000, priority: 10, urgency: 10, isRequired: true },
      { sourceId: 'high-pri', minTokens: 500, desiredTokens: 2000, priority: 90, urgency: 100, isRequired: false },
    ];

    const allocations = allocator.allocatePriority(needs, 400, 0);

    const requiredAlloc = allocations.find(a => a.sourceId === 'required');
    expect(requiredAlloc).toBeDefined();
    expect(requiredAlloc!.allocated).toBeGreaterThan(0);
    expect(requiredAlloc!.isExcluded).toBe(false);
  });

  describe('compress', () => {
    it('should return ratio 1.0 for none level', () => {
      const source = makeSource({ id: 'test', tokenCount: 1000 });
      const result = allocator.compress(source, 'none' as CompressionLevel);

      expect(result.ratio).toBe(1.0);
      expect(result.compressedTokens).toBe(1000);
    });

    it('should return ratio 0.85 for light level', () => {
      const source = makeSource({ id: 'test', tokenCount: 1000 });
      const result = allocator.compress(source, 'light' as CompressionLevel);

      expect(result.ratio).toBe(0.85);
      expect(result.compressedTokens).toBe(850);
    });

    it('should return ratio 0.55 for moderate level', () => {
      const source = makeSource({ id: 'test', tokenCount: 1000 });
      const result = allocator.compress(source, 'moderate' as CompressionLevel);

      expect(result.ratio).toBe(0.55);
      expect(result.compressedTokens).toBe(550);
    });

    it('should return ratio 0.25 for aggressive level', () => {
      const source = makeSource({ id: 'test', tokenCount: 1000 });
      const result = allocator.compress(source, 'aggressive' as CompressionLevel);

      expect(result.ratio).toBe(0.25);
      expect(result.compressedTokens).toBe(250);
    });

    it('should return ratio 0 for excluded level', () => {
      const source = makeSource({ id: 'test', tokenCount: 1000 });
      const result = allocator.compress(source, 'excluded' as CompressionLevel);

      expect(result.ratio).toBe(0);
      expect(result.compressedTokens).toBe(0);
    });
  });
});

describe('PriorityManager', () => {
  let manager: PriorityManager;
  let profile: TaskProfile;

  beforeEach(() => {
    manager = new PriorityManager();
    profile = makeProfile({ taskType: 'code' });
  });

  it('should compute urgency based on source type and priority', () => {
    const systemSource = makeSource({ id: 'sys', type: 'system', priority: 100 });
    const docSource = makeSource({ id: 'doc', type: 'document', priority: 10 });

    const systemUrgency = manager.computeUrgency(systemSource, profile);
    const docUrgency = manager.computeUrgency(docSource, profile);

    expect(systemUrgency).toBeGreaterThan(docUrgency);
  });

  it('should rank sources by urgency descending', () => {
    const needs: SourceNeed[] = [
      { sourceId: 'low', minTokens: 100, desiredTokens: 500, priority: 10, urgency: 10, isRequired: false },
      { sourceId: 'high', minTokens: 100, desiredTokens: 500, priority: 90, urgency: 100, isRequired: false },
    ];

    const ranked = manager.rankSources(needs, profile);

    expect(ranked[0].sourceId).toBe('high');
    expect(ranked[1].sourceId).toBe('low');
  });

  it('should place required sources before non-required', () => {
    const needs: SourceNeed[] = [
      { sourceId: 'non-req', minTokens: 100, desiredTokens: 500, priority: 90, urgency: 100, isRequired: false },
      { sourceId: 'req', minTokens: 100, desiredTokens: 500, priority: 10, urgency: 10, isRequired: true },
    ];

    const ranked = manager.rankSources(needs, profile);

    expect(ranked[0].sourceId).toBe('req');
  });

  it('should adjust priority based on feedback', () => {
    const source = makeSource({ id: 'test', priority: 50 });

    manager.adjustPriority(source, { wasReferenced: true });
    const source2 = makeSource({ id: 'test2', priority: 50 });

    const urgencyAfterUse = manager.computeUrgency(source, profile);
    const urgencyAfterNoUse = manager.computeUrgency(source2, profile);

    expect(urgencyAfterUse).toBeGreaterThan(urgencyAfterNoUse);
  });

  it('should learn from outcome', () => {
    const need: SourceNeed = {
      sourceId: 'test', minTokens: 100, desiredTokens: 500, priority: 50, urgency: 50, isRequired: false,
    };

    manager.learnFromOutcome(need, true);
    manager.learnFromOutcome(need, false);

    const source = makeSource({ id: 'test', priority: 50 });
    const urgency = manager.computeUrgency(source, profile);

    expect(urgency).toBeGreaterThanOrEqual(0);
  });
});

describe('DynamicRenegotiator', () => {
  let renegotiator: DynamicRenegotiator;

  beforeEach(() => {
    renegotiator = new DynamicRenegotiator();
  });

  it('should monitor usage and generate reports', () => {
    const allocations = [
      { sourceId: 'a', allocated: 500, originalRequest: 500, compressionRatio: 'none' as CompressionLevel, isExcluded: false },
      { sourceId: 'b', allocated: 500, originalRequest: 500, compressionRatio: 'none' as CompressionLevel, isExcluded: false },
    ];

    renegotiator.startMonitoring(allocations);

    const reports = renegotiator.getUsageReports();
    expect(reports).toHaveLength(2);
    expect(reports[0].sourceId).toBe('a');
    expect(reports[0].allocated).toBe(500);
    expect(reports[0].used).toBe(0);
  });

  it('should report usage and calculate efficiency', () => {
    const allocations = [
      { sourceId: 'a', allocated: 1000, originalRequest: 1000, compressionRatio: 'none' as CompressionLevel, isExcluded: false },
    ];

    renegotiator.startMonitoring(allocations);
    renegotiator.reportUsage('a', 300);

    const reports = renegotiator.getUsageReports();
    expect(reports[0].used).toBe(300);
    expect(reports[0].efficiency).toBe(0.3);
  });

  it('should reclaim tokens from underutilized sources', () => {
    const allocations = [
      { sourceId: 'a', allocated: 1000, originalRequest: 1000, compressionRatio: 'none' as CompressionLevel, isExcluded: false },
      { sourceId: 'b', allocated: 1000, originalRequest: 1000, compressionRatio: 'none' as CompressionLevel, isExcluded: false },
    ];

    renegotiator.startMonitoring(allocations);
    renegotiator.reportUsage('a', 100);
    renegotiator.reportUsage('b', 900);

    const reclaimed = renegotiator.reclaimTokens(0.5);

    const aReclaim = reclaimed.find(r => r.sourceId === 'a');
    const bReclaim = reclaimed.find(r => r.sourceId === 'b');

    expect(aReclaim).toBeDefined();
    expect(aReclaim!.reclaimedTokens).toBeGreaterThan(0);
    expect(bReclaim).toBeUndefined();
  });

  it('should redistribute reclaimed tokens to hungry sources', () => {
    const allocations = [
      { sourceId: 'a', allocated: 1000, originalRequest: 1000, compressionRatio: 'none' as CompressionLevel, isExcluded: false },
      { sourceId: 'b', allocated: 500, originalRequest: 1000, compressionRatio: 'none' as CompressionLevel, isExcluded: false },
    ];

    renegotiator.startMonitoring(allocations);
    renegotiator.reportUsage('a', 100);
    renegotiator.reportUsage('b', 450);

    const reclaimed = renegotiator.reclaimTokens(0.5);
    const freedTokens = reclaimed.reduce((s, r) => s + r.reclaimedTokens, 0);

    const hungrySources = [
      { sourceId: 'b', needed: 500 },
    ];

    const newAllocations = renegotiator.redistribute(freedTokens, hungrySources);

    const bAlloc = newAllocations.find(a => a.sourceId === 'b');
    expect(bAlloc).toBeDefined();
    expect(bAlloc!.allocated).toBeGreaterThan(500);
  });

  it('should stop monitoring and clear state', () => {
    const allocations = [
      { sourceId: 'a', allocated: 500, originalRequest: 500, compressionRatio: 'none' as CompressionLevel, isExcluded: false },
    ];

    renegotiator.startMonitoring(allocations);
    renegotiator.stopMonitoring();

    const reports = renegotiator.getUsageReports();
    expect(reports).toHaveLength(0);
  });
});

describe('BudgetNegotiator', () => {
  let negotiator: BudgetNegotiator;
  let profile: TaskProfile;

  beforeEach(() => {
    const allocator = new TokenAllocator();
    const priorityManager = new PriorityManager();
    negotiator = new BudgetNegotiator(allocator, priorityManager, {
      enableDynamicRenegotiation: false,
      renegotiationThreshold: 0.5,
      minTokensPerSource: 50,
    });
    profile = makeProfile({ taskType: 'code', complexity: 'medium' });
  });

  it('should negotiate full flow with fair allocation', () => {
    const sources: ContextSource[] = [
      makeSource({ id: 'sys', type: 'system', tokenCount: 500, priority: 100, isRequired: true }),
      makeSource({ id: 'doc', type: 'document', tokenCount: 2000, priority: 30 }),
      makeSource({ id: 'hist', type: 'history', tokenCount: 1000, priority: 20 }),
    ];

    const allocations = negotiator.negotiate(sources, 5000, profile);

    expect(allocations).toHaveLength(3);
    for (const alloc of allocations) {
      expect(alloc.allocated).toBeGreaterThanOrEqual(0);
      expect(alloc.isExcluded).toBe(false);
    }
  });

  it('should ensure required sources always get minimum budget', () => {
    const sources: ContextSource[] = [
      makeSource({ id: 'required', type: 'system', tokenCount: 2000, priority: 100, isRequired: true }),
      makeSource({ id: 'optional', type: 'document', tokenCount: 4000, priority: 10 }),
    ];

    const allocations = negotiator.negotiate(sources, 300, profile);

    const required = allocations.find(a => a.sourceId === 'required');
    const optional = allocations.find(a => a.sourceId === 'optional');

    expect(required).toBeDefined();
    expect(required!.allocated).toBeGreaterThan(0);
    expect(required!.isExcluded).toBe(false);
  });

  it('should apply compression ratios based on allocation ratio', () => {
    const sources: ContextSource[] = [
      makeSource({ id: 'big', type: 'document', tokenCount: 10000, priority: 50 }),
    ];

    const allocations = negotiator.negotiate(sources, 1000, profile);

    expect(allocations[0].compressionRatio).toBe('moderate');
  });

  it('should exclude sources when budget is zero', () => {
    const sources: ContextSource[] = [
      makeSource({ id: 'a', type: 'document', tokenCount: 1000, priority: 50 }),
    ];

    const allocations = negotiator.negotiate(sources, 0, profile);

    expect(allocations[0].isExcluded).toBe(true);
    expect(allocations[0].compressionRatio).toBe('excluded');
  });

  it('should set excluded for allocated=0 sources', () => {
    const sources: ContextSource[] = [
      makeSource({ id: 'a', type: 'document', tokenCount: 1000, priority: 10 }),
    ];

    const allocations = negotiator.negotiate(sources, 0, profile);

    expect(allocations[0].isExcluded).toBe(true);
  });
});

describe('BudgetNegotiator with dynamic renegotiation', () => {
  let negotiator: BudgetNegotiator;
  let profile: TaskProfile;

  beforeEach(() => {
    const allocator = new TokenAllocator();
    const priorityManager = new PriorityManager();
    negotiator = new BudgetNegotiator(allocator, priorityManager, {
      enableDynamicRenegotiation: true,
      renegotiationThreshold: 0.5,
      minTokensPerSource: 100,
    });
    profile = makeProfile({ taskType: 'code', complexity: 'high' });
  });

  it('should integrate dynamic renegotiation', () => {
    const sources: ContextSource[] = [
      makeSource({ id: 'sys', type: 'system', tokenCount: 500, priority: 100, isRequired: true }),
      makeSource({ id: 'doc', type: 'document', tokenCount: 3000, priority: 30 }),
    ];

    const initial = negotiator.negotiate(sources, 2000, profile);

    const used: Record<string, number> = {};
    for (const alloc of initial) {
      used[alloc.sourceId] = Math.floor(alloc.allocated * 0.3);
    }

    const renegotiated = negotiator.renegotiate(used, 2000);

    expect(renegotiated).toHaveLength(2);
  });

  it('should reclaim tokens from underutilized and redistribute', () => {
    const sources: ContextSource[] = [
      makeSource({ id: 'big', type: 'document', tokenCount: 2000, priority: 80 }),
      makeSource({ id: 'small', type: 'document', tokenCount: 500, priority: 20 }),
    ];

    const allocations = negotiator.negotiate(sources, 1500, profile);

    const used: Record<string, number> = {};
    used[allocations[0].sourceId] = Math.floor(allocations[0].allocated * 0.2);

    const renegotiated = negotiator.renegotiate(used, 1500);

    expect(renegotiated.length).toBe(2);
  });
});
