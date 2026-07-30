import { InnovationInitiative } from './innovation-tracker';
import { createLogger } from '@ideia/logger';
const logger = createLogger('roadmap-generator');

export interface RoadmapConfig {
  title: string;
  description: string;
  horizon: 'q1' | 'q2' | 'q3' | 'q4' | 'year' | '2year';
  startDate: Date;
  includeCompleted: boolean;
  groupBy: 'category' | 'status' | 'quarter';
}

export interface RoadmapDocument {
  title: string;
  description: string;
  generated: Date;
  horizon: string;
  summary: { total: number; approved: number; inProgress: number; completed: number };
  sections: RoadmapSection[];
}

export interface RoadmapSection {
  title: string;
  initiatives: RoadmapItem[];
}

export interface RoadmapItem {
  name: string;
  category: string;
  status: string;
  priority: number;
  effort: number;
  impact: number;
  score: number;
  dependencies: string[];
  quarter?: string;
}

export class RoadmapGenerator {
  generate(initiatives: InnovationInitiative[], config: RoadmapConfig): RoadmapDocument {
    const filtered = initiatives.filter(i => config.includeCompleted || i.status !== 'completed');
    const sorted = [...filtered].sort((a, b) => b.priority - a.priority);

    const getQuarter = (date: Date): string => {
      const q = Math.floor(date.getMonth() / 3) + 1;
      return `Q${q} ${date.getFullYear()}`;
    };

    const sections: RoadmapSection[] = [];
    if (config.groupBy === 'category') {
      const groups = new Map<string, InnovationInitiative[]>();
      for (const init of sorted) {
        const list = groups.get(init.category) || [];
        list.push(init);
        groups.set(init.category, list);
      }
      for (const [category, items] of groups) {
        sections.push({
          title: category.charAt(0).toUpperCase() + category.slice(1),
          initiatives: items.map(i => ({
            name: i.name, category: i.category, status: i.status,
            priority: i.priority, effort: i.effort, impact: i.impact,
            score: i.priority * i.impact,
            dependencies: i.dependencies,
            quarter: getQuarter(i.created),
          })),
        });
      }
    } else {
      sections.push({
        title: 'All Initiatives',
        initiatives: sorted.map(i => ({
          name: i.name, category: i.category, status: i.status,
          priority: i.priority, effort: i.effort, impact: i.impact,
          score: i.priority * i.impact,
          dependencies: i.dependencies,
          quarter: getQuarter(i.created),
        })),
      });
    }

    return {
      title: config.title,
      description: config.description,
      generated: new Date(),
      horizon: config.horizon,
      summary: {
        total: filtered.length,
        approved: filtered.filter(i => i.status === 'approved').length,
        inProgress: filtered.filter(i => i.status === 'in-progress').length,
        completed: filtered.filter(i => i.status === 'completed').length,
      },
      sections,
    };
  }

  toMarkdown(doc: RoadmapDocument): string {
    const lines: string[] = [
      `# ${doc.title}`,
      '',
      doc.description,
      '',
      `> Generated: ${doc.generated.toISOString()} | Horizon: ${doc.horizon}`,
      '',
      '## Summary',
      `- Total initiatives: ${doc.summary.total}`,
      `- Approved: ${doc.summary.approved}`,
      `- In Progress: ${doc.summary.inProgress}`,
      `- Completed: ${doc.summary.completed}`,
      '',
    ];

    for (const section of doc.sections) {
      lines.push(`## ${section.title}`, '');
      lines.push('| Initiative | Category | Status | Priority | Effort | Impact | Score | Dependencies |');
      lines.push('|------------|----------|--------|----------|--------|--------|-------|-------------|');
      for (const item of section.initiatives) {
        lines.push(`| ${item.name} | ${item.category} | ${item.status} | ${item.priority} | ${item.effort}h | ${item.impact} | ${item.score} | ${item.dependencies.join(', ') || '-'} |`);
      }
      lines.push('');
    }

    return lines.join('\n');
  }
}
