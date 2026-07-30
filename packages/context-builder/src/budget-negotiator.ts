import { Allocation } from './types-budget';
import { createLogger } from '@ideia/logger';
import { ContextSource } from './types-budget';
import { SourceNeed } from './types-budget';
import { TaskProfile } from './types-budget';
import { BudgetNegotiatorOptions } from './types-budget';
import { NeedDeclarer } from './need-declarer';
import { TokenAllocator } from './token-allocator';
import { PriorityManager } from './priority-manager';
import { DynamicRenegotiator } from './dynamic-renegotiator';
const logger = createLogger('budget-negotiator');

export class BudgetNegotiator {
  private renegotiator: DynamicRenegotiator;
  private sources: ContextSource[] = [];
  private lastAllocations: Allocation[] = [];

  constructor(
    private allocator: TokenAllocator,
    private priorityManager: PriorityManager,
    private options: BudgetNegotiatorOptions = {
      enableDynamicRenegotiation: true,
      renegotiationThreshold: 0.9,
      minTokensPerSource: 100,
    }
  ) {
    this.renegotiator = new DynamicRenegotiator();
  }

  negotiate(
    sources: ContextSource[],
    totalBudget: number,
    profile: TaskProfile
  ): Allocation[] {
    this.sources = sources;
    const declarer = new NeedDeclarer();
    const needs = declarer.declare(sources, profile);

    const validNeeds = needs.filter(n => n.minTokens <= n.desiredTokens);

    const totalMin = validNeeds.reduce((s, n) => s + n.minTokens, 0);

    if (totalMin <= 0) {
      const result = sources.map(s => ({
        sourceId: s.id,
        allocated: 0,
        originalRequest: s.tokenCount,
        compressionRatio: 'excluded' as const,
        isExcluded: true,
      }));
      this.lastAllocations = result;
      return result;
    }

    const needsWithUrgency = validNeeds.map(n => {
      const source = sources.find(s => s.id === n.sourceId);
      const urgency = source !== undefined
        ? this.priorityManager.computeUrgency(source, profile)
        : 0;
      return { ...n, urgency };
    });

    let allocations: Allocation[];

    if (totalMin <= totalBudget) {
      allocations = this.allocator.allocateFair(
        needsWithUrgency,
        totalBudget,
        this.options.minTokensPerSource
      );
    } else {
      const ranked = this.priorityManager.rankSources(needsWithUrgency, profile);
      allocations = this.allocator.allocatePriority(
        ranked,
        totalBudget,
        this.options.minTokensPerSource
      );
    }

    allocations = this.applyCompressionRatios(allocations);

    if (this.options.enableDynamicRenegotiation) {
      this.renegotiator.startMonitoring(allocations);
    }

    this.lastAllocations = allocations;
    return allocations;
  }

  renegotiate(used: Record<string, number>, budget: number): Allocation[] {
    for (const [sourceId, tokensUsed] of Object.entries(used)) {
      this.renegotiator.reportUsage(sourceId, tokensUsed);
    }

    const reclaimed = this.renegotiator.reclaimTokens(this.options.renegotiationThreshold);
    const freedTokens = reclaimed.reduce((s, r) => s + r.reclaimedTokens, 0);

    if (freedTokens <= 0) {
      return this.lastAllocations;
    }

    const hungrySources = this.lastAllocations
      .map(alloc => {
        const source = this.sources.find(s => s.id === alloc.sourceId);
        if (source === undefined) {
          return null;
        }
        return {
          sourceId: alloc.sourceId,
          needed: Math.max(0, source.tokenCount - alloc.allocated),
        };
      })
      .filter((h): h is { sourceId: string; needed: number } => h !== null && h.needed > 0);

    const newAllocations = this.renegotiator.redistribute(freedTokens, hungrySources);
    this.lastAllocations = newAllocations;
    return newAllocations;
  }

  getUsageReports() {
    return this.renegotiator.getUsageReports();
  }

  stopRenegotiation(): void {
    this.renegotiator.stopMonitoring();
  }

  private applyCompressionRatios(allocations: Allocation[]): Allocation[] {
    return allocations.map(allocation => {
      const source = this.sources.find(s => s.id === allocation.sourceId);
      if (source === undefined) {
        return allocation;
      }

      const ratio = source.tokenCount > 0
        ? allocation.allocated / source.tokenCount
        : 1;

      let level: Allocation['compressionRatio'] = 'none';
      if (allocation.isExcluded) {
        level = 'excluded';
      } else if (ratio < 0.1) {
        level = 'aggressive';
      } else if (ratio < 0.4) {
        level = 'moderate';
      } else if (ratio < 0.7) {
        level = 'light';
      }

      return { ...allocation, compressionRatio: level };
    });
  }
}
