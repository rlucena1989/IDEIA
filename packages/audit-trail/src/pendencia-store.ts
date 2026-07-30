import fs from 'fs';
import { createLogger } from '@ideia/logger';
import path from 'path';
import crypto from 'crypto';
const logger = createLogger('pendencia-store');

export interface Pendencia {
  id: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  category: string;
  checkName: string;
  message: string;
  filePath?: string;
  line?: number;
  suggestedFix?: string;
  autoFixCommand?: string;
  createdAt: string;
  resolvedAt?: string;
  status: 'open' | 'acknowledged' | 'resolved' | 'dismissed';
  source: 'continuous' | 'manual' | 'ci';
}

export class PendenciaStore {
  constructor(private filePath: string) {}

  append(p: Omit<Pendencia, 'id' | 'createdAt'>): Pendencia {
    const full: Pendencia = {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      ...p,
    };
    fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
    fs.appendFileSync(this.filePath, JSON.stringify(full) + '\n', 'utf-8');
    return full;
  }

  load(): Pendencia[] {
    if (!fs.existsSync(this.filePath)) return [];
    return fs.readFileSync(this.filePath, 'utf-8').split('\n').filter(l => l.trim()).map(l => {
      try { return JSON.parse(l) as Pendencia; } catch { return null; }
    }).filter((e): e is Pendencia => e !== null);
  }

  query(filter: Partial<Pendencia>): Pendencia[] {
    return this.load().filter(p => {
      for (const [key, value] of Object.entries(filter)) {
        if (!(key in p) || p[key as keyof typeof p] !== value) return false;
      }
      return true;
    });
  }

  resolve(id: string): boolean {
    const pendencias = this.load();
    const idx = pendencias.findIndex(p => p.id === id);
    if (idx === -1) return false;
    pendencias[idx].status = 'resolved';
    pendencias[idx].resolvedAt = new Date().toISOString();
    fs.writeFileSync(this.filePath, pendencias.map(p => JSON.stringify(p)).join('\n') + '\n', 'utf-8');
    return true;
  }

  count(): { open: number; bySeverity: Record<string, number> } {
    const all = this.load();
    const bySeverity: Record<string, number> = {};
    let open = 0;
    for (const p of all) {
      if (p.status === 'open' || p.status === 'acknowledged') {
        open++;
        bySeverity[p.severity] = (bySeverity[p.severity] || 0) + 1;
      }
    }
    return { open, bySeverity };
  }
}
