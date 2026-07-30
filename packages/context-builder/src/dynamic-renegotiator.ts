import { Allocation } from './types-budget';
import { createLogger } from '@ideia/logger';
import { UsageReport } from './types-budget';
const logger = createLogger('dynamic-renegotiator');

export class DynamicRenegotiator {
  private allocationsMap: Map<string, UsageReport> = new Map();
  private monitoringActive: boolean = false;

  startMonitoring(allocations: Allocation[]): void {
    this.monitoringActive = true;
    for (const alloc of allocations) {
      this.allocationsMap.set(alloc.sourceId, {
        sourceId: alloc.sourceId,
        allocated: alloc.allocated,
        used: 0,
        efficiency: 0,
      });
    }
  }

  reportUsage(sourceId: string, used: number): void {
    const report = this.allocationsMap.get(sourceId);
    if (report === undefined) {
      return;
    }
    report.used = used;
    report.efficiency = report.allocated > 0
      ? used / report.allocated
      : 0;
  }

  reclaimTokens(threshold?: number): { sourceId: string; reclaimedTokens: number }[] {
    const effectiveThreshold = threshold ?? 0.5;
    const reclaimed: { sourceId: string; reclaimedTokens: number }[] = [];

    for (const [sourceId, report] of this.allocationsMap) {
      if (report.efficiency < effectiveThreshold && report.allocated > 0) {
        const reclaimAmount = Math.floor(report.allocated - report.used);
        if (reclaimAmount > 0) {
          reclaimed.push({
            sourceId,
            reclaimedTokens: reclaimAmount,
          });
          report.reclaimed = reclaimAmount;
          report.allocated = report.used;
        }
      }
    }

    return reclaimed;
  }

  redistribute(
    freedTokens: number,
    hungrySources: { sourceId: string; needed: number }[]
  ): Allocation[] {
    const allocations: Allocation[] = [];

    if (hungrySources.length === 0 || freedTokens <= 0) {
      for (const [, report] of this.allocationsMap) {
        allocations.push({
          sourceId: report.sourceId,
          allocated: report.allocated,
          originalRequest: report.allocated,
          compressionRatio: 'none',
          isExcluded: false,
        });
      }
      return allocations;
    }

    const totalNeeded = hungrySources.reduce((s, h) => s + h.needed, 0);
    const safeTotal = totalNeeded > 0 ? totalNeeded : 1;

    for (const [, report] of this.allocationsMap) {
      const hungryMatch = hungrySources.find(h => h.sourceId === report.sourceId);
      if (hungryMatch !== undefined) {
        const extra = Math.min(
          Math.floor(freedTokens * (hungryMatch.needed / safeTotal)),
          hungryMatch.needed
        );
        allocations.push({
          sourceId: report.sourceId,
          allocated: report.allocated + extra,
          originalRequest: report.allocated + hungryMatch.needed,
          compressionRatio: 'none',
          isExcluded: false,
        });
      } else {
        allocations.push({
          sourceId: report.sourceId,
          allocated: report.allocated,
          originalRequest: report.allocated,
          compressionRatio: 'none',
          isExcluded: false,
        });
      }
    }

    return allocations;
  }

  getUsageReports(): UsageReport[] {
    return Array.from(this.allocationsMap.values());
  }

  stopMonitoring(): void {
    this.monitoringActive = false;
    this.allocationsMap.clear();
  }
}
