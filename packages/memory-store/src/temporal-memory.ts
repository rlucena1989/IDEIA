/**
 * temporal-memory.ts — Temporal Memory (Item 39)
 *
 * Cada fato tem valid_at/invalid_at timestamps (padrão Zep/Graphiti).
 * Quando novo fato contradiz antigo, marca como invalid_at: now().
 * Queries retrievam apenas fatos ativos.
 */

export interface TemporalFact {
  id: string;
  subject: string;
  predicate: string;
  object: string;
  validAt: string;
  invalidAt: string | null;
  source: string;
  confidence: number;
}

export class TemporalMemory {
  private facts: TemporalFact[] = [];

  addFact(subject: string, predicate: string, object: string, source = 'system'): TemporalFact {
    const now = new Date().toISOString();
    const existing = this.findActive(subject, predicate, object);
    if (existing) {
      existing.invalidAt = now;
    }
    const fact: TemporalFact = {
      id: `fact-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      subject, predicate, object,
      validAt: now, invalidAt: null,
      source, confidence: 1.0,
    };
    this.facts.push(fact);
    return fact;
  }

  query(subject?: string, predicate?: string, at?: string): TemporalFact[] {
    return this.facts.filter(f => {
      if (subject && f.subject !== subject) return false;
      if (predicate && f.predicate !== predicate) return false;
      if (f.invalidAt) return false;
      if (at && new Date(f.validAt) > new Date(at)) return false;
      return true;
    });
  }

  getHistory(subject: string): TemporalFact[] {
    return this.facts
      .filter(f => f.subject === subject)
      .sort((a, b) => new Date(b.validAt).getTime() - new Date(a.validAt).getTime());
  }

  invalidate(id: string): void {
    const fact = this.facts.find(f => f.id === id);
    if (fact) fact.invalidAt = new Date().toISOString();
  }

  private findActive(subject: string, predicate: string, object: string): TemporalFact | undefined {
    return this.facts.find(f => f.subject === subject && f.predicate === predicate && f.object === object && !f.invalidAt);
  }
}
