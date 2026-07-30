import type { FeedbackEntry } from './types';
import { createLogger } from '@ideia/logger';
import type { ClassificationResult } from './classifier';
const logger = createLogger('reporter');

export type ReportFormat = 'json' | 'csv' | 'text';

export interface CategorySummary {
  category: string;
  count: number;
  entries: FeedbackEntry[];
}

export interface PrioritySummary {
  priority: string;
  count: number;
  entries: FeedbackEntry[];
}

export interface WeeklyReport {
  weekStart: string;
  weekEnd: string;
  total: number;
  byCategory: Record<string, number>;
  byPriority: Record<string, number>;
  entries: Array<{ feedback: FeedbackEntry; classification?: ClassificationResult; priority?: string }>;
}

export interface CategoryReport {
  categories: CategorySummary[];
  total: number;
}

export interface PriorityReport {
  priorities: PrioritySummary[];
  total: number;
}

function getWeekRange(date: Date): { start: string; end: string } {
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(date);
  monday.setDate(diff);
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  return { start: monday.toISOString().split('T')[0], end: sunday.toISOString().split('T')[0] };
}

export class FeedbackReporter {
  private items: Array<{ feedback: FeedbackEntry; classification?: ClassificationResult; priority?: string }> = [];

  setItems(items: Array<{ feedback: FeedbackEntry; classification?: ClassificationResult; priority?: string }>): void {
    this.items = items;
  }

  addItem(feedback: FeedbackEntry, classification?: ClassificationResult, priority?: string): void {
    this.items.push({ feedback, classification, priority });
  }

  weeklyReport(): WeeklyReport[] {
    const weeks = new Map<string, WeeklyReport>();
    for (const item of this.items) {
      const date = new Date(item.feedback.createdAt);
      const { start, end } = getWeekRange(date);
      const key = start;
      if (!weeks.has(key)) {
        weeks.set(key, { weekStart: start, weekEnd: end, total: 0, byCategory: {}, byPriority: {}, entries: [] });
      }
      const week = weeks.get(key);
      if (!week) continue;
      week.total++;
      const cat = item.classification?.category ?? 'unclassified';
      week.byCategory[cat] = (week.byCategory[cat] ?? 0) + 1;
      const pri = item.priority ?? 'unprioritized';
      week.byPriority[pri] = (week.byPriority[pri] ?? 0) + 1;
      week.entries.push(item);
    }
    return Array.from(weeks.values()).sort((a, b) => a.weekStart.localeCompare(b.weekStart));
  }

  categoryReport(): CategoryReport {
    const map = new Map<string, CategorySummary>();
    for (const item of this.items) {
      const cat = item.classification?.category ?? 'unclassified';
      if (!map.has(cat)) {
        map.set(cat, { category: cat, count: 0, entries: [] });
      }
      const catEntry = map.get(cat);
      if (catEntry) {
        catEntry.count++;
        catEntry.entries.push(item.feedback);
      }
    }
    const categories = Array.from(map.values()).sort((a, b) => b.count - a.count);
    return { categories, total: this.items.length };
  }

  priorityReport(): PriorityReport {
    const map = new Map<string, PrioritySummary>();
    for (const item of this.items) {
      const pri = item.priority ?? 'unprioritized';
      if (!map.has(pri)) {
        map.set(pri, { priority: pri, count: 0, entries: [] });
      }
      const priEntry = map.get(pri);
      if (priEntry) {
        priEntry.count++;
        priEntry.entries.push(item.feedback);
      }
    }
    const order = ['critical', 'high', 'medium', 'low', 'unprioritized'];
    const priorities = order.map(p => map.get(p)).filter((p): p is PrioritySummary => p !== undefined);
    return { priorities, total: this.items.length };
  }

  export(format: ReportFormat): string {
    switch (format) {
      case 'json':
        return JSON.stringify({ weekly: this.weeklyReport(), byCategory: this.categoryReport(), byPriority: this.priorityReport() }, null, 2);
      case 'csv': {
        const header = 'id,type,source,severity,createdAt,category,priority';
        const rows = this.items.map(i => `${i.feedback.id},${i.feedback.type},${i.feedback.source},${i.feedback.severity},${i.feedback.createdAt},${i.classification?.category ?? ''},${i.priority ?? ''}`);
        return [header, ...rows].join('\n');
      }
      case 'text': {
        const weekly = this.weeklyReport();
        const cat = this.categoryReport();
        const pri = this.priorityReport();
        let out = `=== Feedback Report ===\nTotal: ${this.items.length}\n\n`;
        out += `--- Weekly ---\n`;
        for (const w of weekly) {
          out += `${w.weekStart} - ${w.weekEnd}: ${w.total} items\n  By category: ${JSON.stringify(w.byCategory)}\n  By priority: ${JSON.stringify(w.byPriority)}\n`;
        }
        out += `\n--- By Category ---\n`;
        for (const c of cat.categories) {
          out += `  ${c.category}: ${c.count}\n`;
        }
        out += `\n--- By Priority ---\n`;
        for (const p of pri.priorities) {
          out += `  ${p.priority}: ${p.count}\n`;
        }
        return out;
      }
    }
  }
}
