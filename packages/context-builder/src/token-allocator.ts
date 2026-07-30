import { Allocation } from './types-budget';
import { createLogger } from '@ideia/logger';
import { CompressionLevel } from './types-budget';
import { CompressedContext } from './types-budget';
import { ContextSource } from './types-budget';
import { SourceNeed } from './types-budget';
import { TaskProfile } from './types-budget';
const logger = createLogger('token-allocator');

export class TokenAllocator {
  allocateFair(needs: SourceNeed[], budget: number, minPerSource: number): Allocation[] {
    const minTotal = needs.reduce((s, n) => s + Math.max(n.minTokens, minPerSource), 0);
    const surplus = budget - minTotal;

    if (surplus <= 0) {
      return needs.map(n => ({
        sourceId: n.sourceId,
        allocated: Math.min(n.minTokens, minPerSource),
        originalRequest: n.desiredTokens,
        compressionRatio: 'moderate' as CompressionLevel,
        isExcluded: false,
      }));
    }

    const prioritySum = needs.reduce((s, n) => s + n.priority, 0);
    const safePrioritySum = prioritySum > 0 ? prioritySum : 1;

    return needs.map(n => {
      const baseAlloc = Math.max(n.minTokens, minPerSource);
      const fairShare = n.priority > 0
        ? Math.floor(surplus * (n.priority / safePrioritySum))
        : 0;
      const extra = Math.min(fairShare, n.desiredTokens - baseAlloc);

      return {
        sourceId: n.sourceId,
        allocated: baseAlloc + extra,
        originalRequest: n.desiredTokens,
        compressionRatio: 'none' as CompressionLevel,
        isExcluded: false,
      };
    });
  }

  allocatePriority(needs: SourceNeed[], budget: number, minPerSource: number): Allocation[] {
    const allocations: Allocation[] = [];
    let remaining = budget;

    const sorted = [...needs].sort((a, b) => {
      if (a.isRequired !== b.isRequired) {
        return a.isRequired ? -1 : 1;
      }
      return b.urgency - a.urgency || b.priority - a.priority;
    });

    for (const need of sorted) {
      if (remaining <= 0) {
        allocations.push({
          sourceId: need.sourceId,
          allocated: 0,
          originalRequest: need.desiredTokens,
          compressionRatio: 'excluded' as CompressionLevel,
          isExcluded: true,
        });
        continue;
      }

      const guarantee = Math.min(Math.max(need.minTokens, minPerSource), remaining);
      remaining -= guarantee;

      const ratio = guarantee / need.desiredTokens;
      let level: CompressionLevel;
      if (ratio === 0) {
        level = 'excluded';
      } else if (ratio < 0.1) {
        level = 'aggressive';
      } else if (ratio < 0.4) {
        level = 'moderate';
      } else if (ratio < 0.7) {
        level = 'light';
      } else {
        level = 'none';
      }

      allocations.push({
        sourceId: need.sourceId,
        allocated: guarantee,
        originalRequest: need.desiredTokens,
        compressionRatio: level,
        isExcluded: guarantee === 0,
      });
    }

    if (remaining > 0) {
      const unsatisfied = allocations.filter(
        a => a.allocated < a.originalRequest && !a.isExcluded
      );
      if (unsatisfied.length > 0) {
        const unsatPrioritySum = unsatisfied.reduce((s, a) => {
          const need = needs.find(n => n.sourceId === a.sourceId);
          return s + (need?.priority ?? 1);
        }, 0);
        const safeSum = unsatPrioritySum > 0 ? unsatPrioritySum : 1;

        for (const alloc of allocations) {
          if (alloc.isExcluded || alloc.allocated >= alloc.originalRequest) {
            continue;
          }
          const need = needs.find(n => n.sourceId === alloc.sourceId);
          const extra = Math.floor(remaining * (need?.priority ?? 1) / safeSum);
          const maxExtra = alloc.originalRequest - alloc.allocated;
          alloc.allocated += Math.min(extra, maxExtra);
        }
      }
    }

    return allocations;
  }

  compress(source: ContextSource, level: CompressionLevel): CompressedContext {
    const ratioMap: Record<CompressionLevel, number> = {
      none: 1.0,
      light: 0.85,
      moderate: 0.55,
      aggressive: 0.25,
      excluded: 0,
    };

    const ratio = ratioMap[level];
    const compressedTokens = Math.floor(source.tokenCount * ratio);

    return {
      sourceId: source.id,
      originalTokens: source.tokenCount,
      compressedTokens,
      ratio,
      level,
    };
  }

  allocateByUrgency(needs: SourceNeed[], budget: number, _profile: TaskProfile): Allocation[] {
    const sorted = [...needs].sort((a, b) => {
      if (a.isRequired !== b.isRequired) {
        return a.isRequired ? -1 : 1;
      }
      return b.urgency - a.urgency || b.priority - a.priority;
    });

    return this.allocatePriority(sorted, budget, 0);
  }
}
