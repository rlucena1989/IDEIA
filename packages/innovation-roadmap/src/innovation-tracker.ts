export type InitiativeStatus = 'proposed' | 'in-review' | 'approved' | 'in-progress' | 'completed' | 'deferred' | 'cancelled';

export interface InnovationInitiative {
  id: string;
  name: string;
  description: string;
  category: 'core' | 'ux' | 'infrastructure' | 'ai' | 'security' | 'integration' | 'enterprise';
  status: InitiativeStatus;
  priority: number;
  effort: number;
  impact: number;
  dependencies: string[];
  owner: string;
  created: Date;
  updated: Date;
  tags: string[];
}

export class InnovationTracker {
  private initiatives: Map<string, InnovationInitiative> = new Map();

  add(initiative: InnovationInitiative): void {
    this.initiatives.set(initiative.id, initiative);
  }

  get(id: string): InnovationInitiative | undefined {
    return this.initiatives.get(id);
  }

  updateStatus(id: string, status: InitiativeStatus): void {
    const init = this.initiatives.get(id);
    if (init) {
      init.status = status;
      init.updated = new Date();
    }
  }

  list(filter?: { status?: InitiativeStatus; category?: string }): InnovationInitiative[] {
    let result = Array.from(this.initiatives.values());
    if (filter?.status) result = result.filter(i => i.status === filter.status);
    if (filter?.category) result = result.filter(i => i.category === filter.category);
    return result.sort((a, b) => b.priority - a.priority);
  }

  getByCategory(category: string): InnovationInitiative[] {
    return this.list({ category });
  }

  getByStatus(status: InitiativeStatus): InnovationInitiative[] {
    return this.list({ status });
  }

  getStats(): { total: number; byStatus: Record<string, number>; byCategory: Record<string, number> } {
    const byStatus: Record<string, number> = {};
    const byCategory: Record<string, number> = {};
    for (const init of this.initiatives.values()) {
      byStatus[init.status] = (byStatus[init.status] || 0) + 1;
      byCategory[init.category] = (byCategory[init.category] || 0) + 1;
    }
    return {
      total: this.initiatives.size,
      byStatus,
      byCategory,
    };
  }

  search(query: string): InnovationInitiative[] {
    const lower = query.toLowerCase();
    return Array.from(this.initiatives.values()).filter(i =>
      i.name.toLowerCase().includes(lower) ||
      i.description.toLowerCase().includes(lower) ||
      i.tags.some(t => t.toLowerCase().includes(lower))
    );
  }
}
