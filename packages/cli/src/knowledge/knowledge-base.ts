import { KnowledgeEntry } from './knowledge-types';

export class KnowledgeBase {
  private entries: KnowledgeEntry[] = [];

  upsert(entry: KnowledgeEntry): void {
    const index = this.entries.findIndex(e => e.knowledgeId === entry.knowledgeId);
    if (index >= 0) {
      this.entries[index] = { ...entry, updatedAt: new Date().toISOString() };
    } else {
      this.entries.push(entry);
    }
  }

  remove(knowledgeId: string): boolean {
    const before = this.entries.length;
    this.entries = this.entries.filter(e => e.knowledgeId !== knowledgeId);
    return this.entries.length < before;
  }

  list(): KnowledgeEntry[] {
    return [...this.entries];
  }

  findByCategory(category: KnowledgeEntry['category']): KnowledgeEntry[] {
    return this.entries.filter(e => e.category === category);
  }

  findByStatus(status: KnowledgeEntry['status']): KnowledgeEntry[] {
    return this.entries.filter(e => e.status === status);
  }

  search(query: string): KnowledgeEntry[] {
    const q = query.toLowerCase();
    return this.entries.filter(e =>
      e.title.toLowerCase().includes(q) ||
      e.content.toLowerCase().includes(q) ||
      e.tags.some(t => t.toLowerCase().includes(q))
    );
  }

  count(): number {
    return this.entries.length;
  }

  clear(): void {
    this.entries = [];
  }
}
