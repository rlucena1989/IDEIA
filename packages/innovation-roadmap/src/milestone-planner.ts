export interface Milestone {
  id: string;
  name: string;
  description: string;
  date: Date;
  deliverables: string[];
  phase: string;
  dependencies: string[];
  completed: boolean;
}

export interface Phase {
  id: string;
  name: string;
  description: string;
  startDate: Date;
  endDate: Date;
  milestones: Milestone[];
  status: 'planned' | 'active' | 'completed' | 'delayed';
}

export class MilestonePlanner {
  private phases: Phase[] = [];

  addPhase(phase: Phase): void {
    this.phases.push(phase);
  }

  addMilestone(phaseId: string, milestone: Milestone): void {
    const phase = this.phases.find(p => p.id === phaseId);
    if (phase) phase.milestones.push(milestone);
  }

  getPhases(): Phase[] {
    return [...this.phases];
  }

  getPhase(id: string): Phase | undefined {
    return this.phases.find(p => p.id === id);
  }

  getMilestones(status?: boolean): Milestone[] {
    const all = this.phases.flatMap(p => p.milestones);
    return status !== undefined ? all.filter(m => m.completed === status) : all;
  }

  getCompletion(): { total: number; completed: number; percent: number } {
    const all = this.getMilestones();
    const done = all.filter(m => m.completed).length;
    return { total: all.length, completed: done, percent: all.length > 0 ? Math.round((done / all.length) * 100) : 0 };
  }

  generateGantt(): string {
    const lines: string[] = ['```mermaid', 'gantt', `  title Milestone Plan`, `  dateFormat YYYY-MM-DD`, ''];
    for (const phase of this.phases) {
      lines.push(`  section ${phase.name}`);
      for (const ms of phase.milestones) {
        const dateStr = ms.date.toISOString().slice(0, 10);
        const status = ms.completed ? 'done' : 'active';
        lines.push(`  ${ms.name} :${status} ${dateStr}, 1d`);
      }
    }
    lines.push('```');
    return lines.join('\n');
  }
}
