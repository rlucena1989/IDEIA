import { randomUUID } from 'crypto'; import * as fs from 'fs'; import * as path from 'path';
import { createLogger } from '@ideia/logger';
import { ADRStatus, ArchitecturalDecision, ADRSummary, TradeOffAnalysis } from './types';
const STORAGE = '.ai/architecture/adr';
export class ArchitectureADR {
  private decisions: Map<string,ArchitecturalDecision> = new Map();
  private storagePath: string;
  constructor(storagePath?: string) { this.storagePath = storagePath || process.cwd(); }
  propose(title: string, context: string, decision: string, consequences: string[], options: { name: string; pros: string[]; cons: string[] }[], tags: string[] = []): ArchitecturalDecision {
    const adr: ArchitecturalDecision = { id: randomUUID(), title, status: 'proposed', context, decision, consequences, options, tags, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    this.decisions.set(adr.id, adr); this.save(); return adr;
  }
  accept(id: string): boolean { const d = this.decisions.get(id); if (!d) return false; d.status = 'accepted'; d.updatedAt = new Date().toISOString(); this.save(); return true; }
  deprecate(id: string, supersededBy?: string): boolean { const d = this.decisions.get(id); if (!d) return false; d.status = 'deprecated'; d.supersededBy = supersededBy; d.updatedAt = new Date().toISOString(); this.save(); return true; }
  get(id: string): ArchitecturalDecision | undefined { return this.decisions.get(id); }
  list(status?: ADRStatus): ArchitecturalDecision[] {
    let r = Array.from(this.decisions.values());
    if (status) r = r.filter(d => d.status === status);
    return r.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
  getSummary(): ADRSummary {
    const all = this.list(); const byStatus: Record<string,number> = {};
    all.forEach(d => { byStatus[d.status] = (byStatus[d.status] || 0) + 1; });
    return { total: all.length, byStatus, recent: all.slice(0, 5) };
  }
  analyzeTradeOffs(id: string): TradeOffAnalysis | null {
    const d = this.decisions.get(id); if (!d || d.options.length < 2) return null;
    const sorted = [...d.options].sort((a,b) => (b.pros.length - b.cons.length) - (a.pros.length - a.cons.length));
    const chosen = sorted[0].name; const runnersUp = sorted.slice(1, 3).map(o => o.name);
    const riskLevel = d.consequences.filter(c => c.toLowerCase().includes('risk')).length > 2 ? 'high' : d.consequences.length > 5 ? 'medium' : 'low';
    const confidence = Math.min(1, Math.max(0.5, (d.options[0].pros.length / Math.max(1, d.options[0].pros.length + d.options[0].cons.length))));
    return { decisionId: id, chosen, runnersUp, riskLevel, confidence: Math.round(confidence * 100) / 100 };
  }
  search(query: string): ArchitecturalDecision[] {
    const q = query.toLowerCase();
    return Array.from(this.decisions.values()).filter(d => d.title.toLowerCase().includes(q) || d.context.toLowerCase().includes(q) || d.tags.some(t => t.toLowerCase().includes(q)));
  }
  save(): void { const dir = path.join(this.storagePath, STORAGE); fs.mkdirSync(dir, {recursive:true}); fs.writeFileSync(path.join(dir, 'decisions.json'), JSON.stringify(Array.from(this.decisions.values()), null, 2), 'utf-8'); }
  load(): void { const f = path.join(this.storagePath, STORAGE, 'decisions.json'); if (!fs.existsSync(f)) return; this.decisions.clear(); JSON.parse(fs.readFileSync(f, 'utf-8')).forEach((d: ArchitecturalDecision) => this.decisions.set(d.id, d)); }
}
export function createArchitectureADR(storagePath?: string): ArchitectureADR { return new ArchitectureADR(storagePath); }
