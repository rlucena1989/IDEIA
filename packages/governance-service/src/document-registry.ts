export type DocumentType = 'adr' | 'study' | 'governance' | 'api' | 'guide' | 'report';
export type DocumentStatus = 'draft' | 'review' | 'approved' | 'deprecated' | 'archived';

export interface DocumentEntry {
  id: string;
  title: string;
  type: DocumentType;
  path: string;
  status: DocumentStatus;
  version: string;
  author: string;
  description: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  reviewedAt?: string;
  reviewer?: string;
  dependencies: string[];
}

export class DocumentRegistry {
  private documents: Map<string, DocumentEntry> = new Map();
  private persistencePath: string;

  constructor(persistencePath: string) {
    this.persistencePath = persistencePath;
    this.load();
  }

  register(document: Omit<DocumentEntry, 'id' | 'createdAt' | 'updatedAt'>): DocumentEntry {
    const entry: DocumentEntry = {
      ...document,
      id: `doc_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.documents.set(entry.id, entry);
    this.persist();
    return entry;
  }

  update(docId: string, updates: Partial<DocumentEntry>): DocumentEntry | null {
    const entry = this.documents.get(docId);
    if (!entry) return null;
    Object.assign(entry, updates, { updatedAt: new Date().toISOString() });
    this.documents.set(docId, entry);
    this.persist();
    return { ...entry };
  }

  get(docId: string): DocumentEntry | null {
    return this.documents.get(docId) ?? null;
  }

  findByPath(path: string): DocumentEntry | null {
    return Array.from(this.documents.values()).find(d => d.path === path) ?? null;
  }

  findByType(type: DocumentType): DocumentEntry[] {
    return Array.from(this.documents.values()).filter(d => d.type === type);
  }

  findByStatus(status: DocumentStatus): DocumentEntry[] {
    return Array.from(this.documents.values()).filter(d => d.status === status);
  }

  findByTag(tag: string): DocumentEntry[] {
    return Array.from(this.documents.values()).filter(d => d.tags.includes(tag));
  }

  search(query: string): DocumentEntry[] {
    const q = query.toLowerCase();
    return Array.from(this.documents.values()).filter(d =>
      d.title.toLowerCase().includes(q) ||
      d.description.toLowerCase().includes(q) ||
      d.tags.some(t => t.toLowerCase().includes(q))
    );
  }

  listAll(): DocumentEntry[] {
    return Array.from(this.documents.values())
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  count(): number {
    return this.documents.size;
  }

  getStats(): Record<DocumentType, number> {
    const stats = { adr: 0, study: 0, governance: 0, api: 0, guide: 0, report: 0 };
    for (const doc of this.documents.values()) {
      stats[doc.type]++;
    }
    return stats;
  }

  private load(): void {
    try {
      const fs = require('fs');
      if (fs.existsSync(this.persistencePath)) {
        const data = fs.readFileSync(this.persistencePath, 'utf-8');
        const parsed = JSON.parse(data) as DocumentEntry[];
        for (const entry of parsed) {
          this.documents.set(entry.id, entry);
        }
      }
    } catch {
      this.documents.clear();
    }
  }

  private persist(): void {
    try {
      const fs = require('fs');
      fs.writeFileSync(this.persistencePath, JSON.stringify(this.listAll(), null, 2), 'utf-8');
    } catch {
      // Silently fail
    }
  }
}

export function createDocumentRegistry(persistencePath: string): DocumentRegistry {
  return new DocumentRegistry(persistencePath);
}
