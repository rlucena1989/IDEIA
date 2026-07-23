import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { KnowledgeGraph } from './knowledge-graph';

export interface DetectedPattern {
  id: string;
  name: string;
  frequency: number;
  confidence: number;
  firstSeen: string;
  lastSeen: string;
  relatedPatterns: string[];
  source?: 'statistical' | 'llm';
}

export interface PatternDetectorConfig {
  llmEndpoint?: string;
  llmModel?: string;
  minOccurrences?: number;
  filePath?: string;
}

interface RawEntry {
  id: string;
  text: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

interface PatternStore {
  patterns: DetectedPattern[];
  entries: RawEntry[];
  version: number;
}

function tokenize(text: string): string[] {
  return text.toLowerCase().split(/\W+/).filter(Boolean);
}

function cosineSimilarity(a: string[], b: string[]): number {
  const setA = new Set(a);
  const setB = new Set(b);
  const intersection = new Set([...setA].filter(x => setB.has(x)));
  const denom = Math.sqrt(setA.size) * Math.sqrt(setB.size);
  return denom === 0 ? 0 : intersection.size / denom;
}

export class PatternDetector {
  private config: PatternDetectorConfig;
  private patterns: DetectedPattern[] = [];
  private entries: RawEntry[] = [];
  private dirty = false;
  private _knowledgeGraph?: KnowledgeGraph;

  get knowledgeGraph(): KnowledgeGraph | undefined {
    return this._knowledgeGraph;
  }

  set knowledgeGraph(kg: KnowledgeGraph | undefined) {
    this._knowledgeGraph = kg;
  }

  setKnowledgeGraph(kg: KnowledgeGraph): void {
    this._knowledgeGraph = kg;
  }

  constructor(config: PatternDetectorConfig = {}) {
    this.config = {
      llmEndpoint: 'http://127.0.0.1:11434',
      llmModel: 'phi-4-mini',
      minOccurrences: 3,
      ...config,
    };
    if (this.config.filePath) {
      this.load();
    }
  }

  record(text: string, metadata?: Record<string, unknown>): void {
    this.entries.push({
      id: crypto.randomUUID(),
      text,
      timestamp: new Date().toISOString(),
      metadata,
    });
    this.dirty = true;
  }

  detect(): DetectedPattern[] {
    const freq = new Map<string, { count: number; timestamps: string[]; texts: string[] }>();
    for (const entry of this.entries) {
      const tokens = tokenize(entry.text);
      if (tokens.length === 0) continue;
      const key = tokens.join(' ');
      if (!freq.has(key)) {
        freq.set(key, { count: 0, timestamps: [], texts: [] });
      }
      const f = freq.get(key) ?? null;
      f.count++;
      f.timestamps.push(entry.timestamp);
      if (f.texts.length < 5) f.texts.push(entry.text);
    }

    const minOcc = this.config.minOccurrences ?? 3;
    const newPatterns: DetectedPattern[] = [];
    for (const [key, f] of freq) {
      if (f.count < minOcc) continue;
      const times = f.timestamps.sort();
      const related = this.findRelated(key, freq);
      newPatterns.push({
        id: `pat-${crypto.createHash('md5').update(key).digest('hex').slice(0, 8)}`,
        name: key.slice(0, 80),
        frequency: f.count,
        confidence: Math.min(f.count / 20, 1),
        firstSeen: times[0]!,
        lastSeen: times[times.length - 1]!,
        relatedPatterns: related,
        source: 'statistical',
      });
    }

    this.mergePatterns(newPatterns);
    this.dirty = true;
    if (this.config.filePath) this.save();
    return this.patterns;
  }

  async detectAll(): Promise<DetectedPattern[]> {
    this.detect();
    await this.detectWithLLM();
    const result = this.getPatterns();
    this.storePatternsInKg(result);
    return result;
  }

  getPatterns(): DetectedPattern[] {
    return [...this.patterns];
  }

  getTrends(): DetectedPattern[] {
    const now = Date.now();
    const weekMs = 7 * 24 * 60 * 60 * 1000;
    return this.patterns
      .filter(p => new Date(p.lastSeen).getTime() > now - weekMs)
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 20);
  }

  getPatternHistory(months?: number): Array<{ month: string; patterns: DetectedPattern[]; count: number }> {
    let filtered = this.patterns;
    if (months !== undefined) {
      const cutoff = new Date();
      cutoff.setMonth(cutoff.getMonth() - months);
      filtered = this.patterns.filter(p => new Date(p.firstSeen) >= cutoff);
    }
    const grouped = new Map<string, DetectedPattern[]>();
    for (const p of filtered) {
      const d = new Date(p.firstSeen);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key) ?? {}.push(p);
    }
    return Array.from(grouped.entries())
      .map(([month, patterns]) => ({ month, patterns, count: patterns.length }))
      .sort((a, b) => a.month.localeCompare(b.month));
  }

  private storePatternsInKg(patterns: DetectedPattern[]): void {
    if (!this._knowledgeGraph) return;
    const nodeIds = new Map<string, string>();
    for (const p of patterns) {
      const existing = this._knowledgeGraph.queryNodes('pattern', p.name);
      if (existing.length > 0) {
        nodeIds.set(p.name, existing[0].id);
      } else {
        const id = this._knowledgeGraph.addNode({
          type: 'pattern',
          name: p.name,
          properties: {
            confidence: p.confidence,
            occurrences: p.frequency,
            source: p.source || 'statistical',
            lastDetected: p.lastSeen,
          },
        });
        nodeIds.set(p.name, id);
      }
    }
    for (const p of patterns) {
      const sourceId = nodeIds.get(p.name);
      if (!sourceId) continue;
      for (const relatedName of p.relatedPatterns) {
        const targetId = nodeIds.get(relatedName);
        if (targetId) {
          this._knowledgeGraph.addEdge({
            source: sourceId,
            target: targetId,
            relation: 'co_occurs',
          });
        }
      }
    }
  }

  private findRelated(key: string, freqMap: Map<string, { count: number; timestamps: string[]; texts: string[] }>): string[] {
    const tokens = key.split(' ');
    const related: string[] = [];
    for (const [otherKey] of freqMap) {
      if (otherKey === key) continue;
      const otherTokens = otherKey.split(' ');
      if (cosineSimilarity(tokens, otherTokens) > 0.3) {
        related.push(otherKey.slice(0, 80));
      }
    }
    return related.slice(0, 5);
  }

  private mergePatterns(newPatterns: DetectedPattern[]): void {
    const map = new Map<string, DetectedPattern>();
    for (const p of this.patterns) map.set(p.name, p);
    for (const np of newPatterns) {
      const existing = map.get(np.name);
      if (existing) {
        existing.frequency = np.frequency;
        existing.confidence = Math.max(existing.confidence, np.confidence);
        existing.lastSeen = np.lastSeen;
        existing.relatedPatterns = [...new Set([...existing.relatedPatterns, ...np.relatedPatterns])];
      } else {
        map.set(np.name, np);
      }
    }
    this.patterns = Array.from(map.values()).sort((a, b) => b.frequency - a.frequency);
  }

  save(): void {
    if (!this.config.filePath) return;
    const store: PatternStore = { patterns: this.patterns, entries: this.entries, version: 1 };
    const dir = path.dirname(this.config.filePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(this.config.filePath, JSON.stringify(store, null, 2), 'utf-8');
    this.dirty = false;
  }

  load(): void {
    if (!this.config.filePath || !fs.existsSync(this.config.filePath)) return;
    try {
      const raw = fs.readFileSync(this.config.filePath, 'utf-8');
      const store = JSON.parse(raw) as PatternStore;
      this.patterns = store.patterns ?? [];
      this.entries = store.entries ?? [];
      this.dirty = false;
    } catch (_err) {
      // Log silenciado propositalmente — falha nao bloqueia fluxo
    }
  }

  isDirty(): boolean {
    return this.dirty;
  }

  clear(): void {
    this.patterns = [];
    this.entries = [];
    this.dirty = true;
  }

  async detectWithLLM(history?: string[]): Promise<DetectedPattern[]> {
    try {
      const sample = (history ?? this.entries.map(e => e.text)).slice(-20);
      const input = `Analyze these development actions for recurring patterns:\n${sample.map(s => `- ${s}`).join('\n')}`;
      const response = await fetch(`${this.config.llmEndpoint}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.config.llmModel,
          messages: [
            { role: 'system', content: 'Extract recurring patterns from development history. Respond JSON: {"patterns":[{"name":"...","frequency":0,"confidence":0.0}]}' },
            { role: 'user', content: input.slice(0, 3000) },
          ],
          stream: false,
          options: { temperature: 0.1, num_predict: 512 },
        }),
        signal: AbortSignal.timeout(10000),
      });
      if (!response.ok) throw new Error('LLM unavailable');
      const data = await response.json() as { message?: { content?: string } };
      const content = data?.message?.content || '';
      const parsed = JSON.parse(content) as { patterns?: Array<{ name: string; frequency: number; confidence: number }> };
      if (!parsed.patterns) return [];

      const now = new Date().toISOString();
      const llmPatterns: DetectedPattern[] = parsed.patterns.map((p, i) => ({
        id: `llm-pat-${i}`,
        name: p.name || 'Unknown pattern',
        frequency: p.frequency || 1,
        confidence: p.confidence || 0.5,
        firstSeen: now,
        lastSeen: now,
        relatedPatterns: [],
        source: 'llm',
      }));

      this.mergePatterns(llmPatterns);
      if (this.config.filePath) this.save();
      return llmPatterns;
    } catch {
      return [];
    }
  }
}
