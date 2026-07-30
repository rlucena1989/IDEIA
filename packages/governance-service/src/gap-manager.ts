export type GapSeverity = 'critical' | 'high' | 'medium' | 'low';
export type GapStatus = 'open' | 'in-progress' | 'resolved' | 'wontfix';
export type GapCategory = 'security' | 'performance' | 'quality' | 'architecture' | 'documentation' | 'testing' | 'compliance';

export interface GapEntry {
  id: string;
  title: string;
  description: string;
  severity: GapSeverity;
  status: GapStatus;
  category: GapCategory;
  source: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  resolution?: string;
  assignedTo?: string;
  blocking: boolean;
  metadata?: Record<string, unknown>;
}

export interface GapReport {
  total: number;
  open: number;
  inProgress: number;
  resolved: number;
  critical: number;
  blocking: number;
  byCategory: Record<GapCategory, number>;
  bySeverity: Record<GapSeverity, number>;
}

export class GapManager {
  private gaps: Map<string, GapEntry> = new Map();
  private persistencePath: string;

  constructor(persistencePath: string) {
    this.persistencePath = persistencePath;
    this.load();
  }

  registerGap(
    title: string,
    description: string,
    severity: GapSeverity,
    category: GapCategory,
    source: string,
    blocking: boolean
  ): GapEntry {
    const gap: GapEntry = {
      id: `gap_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      title,
      description,
      severity,
      status: 'open',
      category,
      source,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      blocking,
    };
    this.gaps.set(gap.id, gap);
    this.persist();
    return gap;
  }

  updateGap(gapId: string, updates: Partial<GapEntry>): GapEntry | null {
    const gap = this.gaps.get(gapId);
    if (!gap) return null;

    Object.assign(gap, updates, { updatedAt: new Date().toISOString() });
    if (updates.status === 'resolved' && !gap.resolvedAt) {
      gap.resolvedAt = new Date().toISOString();
    }
    this.gaps.set(gapId, gap);
    this.persist();
    return { ...gap };
  }

  resolveGap(gapId: string, resolution: string): GapEntry | null {
    const gap = this.gaps.get(gapId);
    if (!gap) return null;

    gap.status = 'resolved';
    gap.resolution = resolution;
    gap.resolvedAt = new Date().toISOString();
    gap.updatedAt = new Date().toISOString();
    this.gaps.set(gapId, gap);
    this.persist();
    return { ...gap };
  }

  getGap(gapId: string): GapEntry | null {
    return this.gaps.get(gapId) ?? null;
  }

  listGaps(status?: GapStatus, category?: GapCategory): GapEntry[] {
    let result = Array.from(this.gaps.values());
    if (status) result = result.filter(g => g.status === status);
    if (category) result = result.filter(g => g.category === category);
    return result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  getBlockingGaps(): GapEntry[] {
    return this.listGaps().filter(g => g.blocking && g.status !== 'resolved' && g.status !== 'wontfix');
  }

  generateReport(): GapReport {
    const all = Array.from(this.gaps.values());
    const byCategory = { security: 0, performance: 0, quality: 0, architecture: 0, documentation: 0, testing: 0, compliance: 0 };
    const bySeverity = { critical: 0, high: 0, medium: 0, low: 0 };

    for (const g of all) {
      byCategory[g.category]++;
      bySeverity[g.severity]++;
    }

    return {
      total: all.length,
      open: all.filter(g => g.status === 'open').length,
      inProgress: all.filter(g => g.status === 'in-progress').length,
      resolved: all.filter(g => g.status === 'resolved').length,
      critical: all.filter(g => g.severity === 'critical').length,
      blocking: all.filter(g => g.blocking && g.status !== 'resolved').length,
      byCategory,
      bySeverity,
    };
  }

  private load(): void {
    try {
      const fs = require('fs');
      if (fs.existsSync(this.persistencePath)) {
        const data = fs.readFileSync(this.persistencePath, 'utf-8');
        const parsed = JSON.parse(data) as GapEntry[];
        for (const entry of parsed) {
          this.gaps.set(entry.id, entry);
        }
      }
    } catch {
      this.gaps.clear();
    }
  }

  private persist(): void {
    try {
      const fs = require('fs');
      fs.writeFileSync(this.persistencePath, JSON.stringify(this.listGaps(), null, 2), 'utf-8');
    } catch {
      // Silently fail
    }
  }
}

export function createGapManager(persistencePath: string): GapManager {
  return new GapManager(persistencePath);
}
