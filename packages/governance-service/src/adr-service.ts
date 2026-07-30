export type AdrStatus = 'proposed' | 'accepted' | 'deprecated' | 'superseded';
export type AdrImpact = 'low' | 'medium' | 'high' | 'critical';

export interface AdrEntry {
  id: string;
  title: string;
  status: AdrStatus;
  context: string;
  decision: string;
  consequences: string;
  impact: AdrImpact;
  author: string;
  date: string;
  tags: string[];
  supersededBy?: string;
  alternatives: string[];
  metadata?: Record<string, unknown>;
}

export class AdrService {
  private adrs: Map<string, AdrEntry> = new Map();
  private persistencePath: string;

  constructor(persistencePath: string) {
    this.persistencePath = persistencePath;
    this.load();
  }

  createAdr(
    title: string,
    context: string,
    decision: string,
    consequences: string,
    impact: AdrImpact,
    author: string,
    tags: string[]
  ): AdrEntry {
    const adr: AdrEntry = {
      id: `adr_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      title,
      status: 'proposed',
      context,
      decision,
      consequences,
      impact,
      author,
      date: new Date().toISOString(),
      tags,
      alternatives: [],
    };
    this.adrs.set(adr.id, adr);
    this.persist();
    return adr;
  }

  acceptAdr(adrId: string): AdrEntry | null {
    const adr = this.adrs.get(adrId);
    if (!adr) return null;
    adr.status = 'accepted';
    this.adrs.set(adrId, adr);
    this.persist();
    return { ...adr };
  }

  deprecateAdr(adrId: string, supersededBy?: string): AdrEntry | null {
    const adr = this.adrs.get(adrId);
    if (!adr) return null;
    adr.status = supersededBy ? 'superseded' : 'deprecated';
    if (supersededBy) adr.supersededBy = supersededBy;
    this.adrs.set(adrId, adr);
    this.persist();
    return { ...adr };
  }

  addAlternative(adrId: string, alternative: string): AdrEntry | null {
    const adr = this.adrs.get(adrId);
    if (!adr) return null;
    adr.alternatives.push(alternative);
    this.adrs.set(adrId, adr);
    this.persist();
    return { ...adr };
  }

  getAdr(adrId: string): AdrEntry | null {
    return this.adrs.get(adrId) ?? null;
  }

  listAdrs(status?: AdrStatus): AdrEntry[] {
    let result = Array.from(this.adrs.values());
    if (status) result = result.filter(a => a.status === status);
    return result.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  findByTag(tag: string): AdrEntry[] {
    return Array.from(this.adrs.values()).filter(a => a.tags.includes(tag));
  }

  search(query: string): AdrEntry[] {
    const q = query.toLowerCase();
    return Array.from(this.adrs.values()).filter(a =>
      a.title.toLowerCase().includes(q) ||
      a.context.toLowerCase().includes(q) ||
      a.decision.toLowerCase().includes(q)
    );
  }

  getStats(): { total: number; proposed: number; accepted: number; deprecated: number; superseded: number } {
    const all = Array.from(this.adrs.values());
    return {
      total: all.length,
      proposed: all.filter(a => a.status === 'proposed').length,
      accepted: all.filter(a => a.status === 'accepted').length,
      deprecated: all.filter(a => a.status === 'deprecated').length,
      superseded: all.filter(a => a.status === 'superseded').length,
    };
  }

  private load(): void {
    try {
      const fs = require('fs');
      if (fs.existsSync(this.persistencePath)) {
        const data = fs.readFileSync(this.persistencePath, 'utf-8');
        const parsed = JSON.parse(data) as AdrEntry[];
        for (const entry of parsed) {
          this.adrs.set(entry.id, entry);
        }
      }
    } catch {
      this.adrs.clear();
    }
  }

  private persist(): void {
    try {
      const fs = require('fs');
      fs.writeFileSync(this.persistencePath, JSON.stringify(this.listAdrs(), null, 2), 'utf-8');
    } catch {
      // Silently fail
    }
  }
}

export function createAdrService(persistencePath: string): AdrService {
  return new AdrService(persistencePath);
}
