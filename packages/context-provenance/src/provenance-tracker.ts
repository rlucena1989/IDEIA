import { createHash, randomUUID } from 'crypto';
import { createLogger } from '@ideia/logger';
import {
  ProvenanceEntry, ProvenanceReason, ContextItem,
  AuditChain, SourceType, SourceStats,
} from './types';
const logger = createLogger('provenance-tracker');

export class ProvenanceTracker {
  private _entries: ProvenanceEntry[] = [];
  private _sessionId: string;
  private _llmModel: string = 'unknown';
  private _tokensUsed: number = 0;

  constructor() {
    this._sessionId = randomUUID();
  }

  setLLMModel(model: string): void {
    this._llmModel = model;
  }

  setTokensUsed(tokens: number): void {
    this._tokensUsed = tokens;
  }

  recordInclusion(item: ContextItem, score: number, reason?: string): ProvenanceEntry {
    const contentHash = this._hashContent(item.content);
    const sourceHash = this._hashSource(item.source, item.sourceType);
    const previousHash = this._entries.length > 0
      ? this._entries[this._entries.length - 1].hash
      : '0';

    const entryBase = {
      previousHash,
      itemId: item.id,
      source: item.source,
      reason: reason ?? ProvenanceReason.INCLUDED,
      score,
      contentHash,
      timestamp: Date.now(),
    };
    const hash = this._hashEntry(entryBase);

    const entry: ProvenanceEntry = {
      id: randomUUID(),
      itemId: item.id,
      source: item.source,
      sourceType: item.sourceType,
      reason: reason ?? ProvenanceReason.INCLUDED,
      score,
      contentHash,
      sourceHash,
      metadata: {
        tokenCount: item.tokenCount,
        relevanceScore: item.relevanceScore,
        ...item.metadata,
      },
      timestamp: Date.now(),
      previousHash,
      hash,
      sequence: this._entries.length + 1,
    };

    this._entries.push(entry);
    return entry;
  }

  recordExclusion(
    item: ContextItem, reason: ProvenanceReason, detail?: string,
  ): ProvenanceEntry {
    const contentHash = this._hashContent(item.content);
    const sourceHash = this._hashSource(item.source, item.sourceType);
    const previousHash = this._entries.length > 0
      ? this._entries[this._entries.length - 1].hash
      : '0';

    const entryBase = { previousHash, itemId: item.id, source: item.source, reason, score: 0, contentHash, timestamp: Date.now() };
    const hash = this._hashEntry(entryBase);

    const entry: ProvenanceEntry = {
      id: randomUUID(),
      itemId: item.id,
      source: item.source,
      sourceType: item.sourceType,
      reason,
      score: 0,
      contentHash,
      sourceHash,
      metadata: { detail: detail ?? '', tokenCount: item.tokenCount },
      timestamp: Date.now(),
      previousHash,
      hash,
      sequence: this._entries.length + 1,
    };

    this._entries.push(entry);
    return entry;
  }

  recordContextBatch(items: ContextItem[], scores: number[]): ProvenanceEntry[] {
    return items.map((item, i) => this.recordInclusion(item, scores[i] ?? 0));
  }

  recordLLMResponse(response: string): void {
    const contextHashes = this._entries
      .filter(e => e.reason === ProvenanceReason.INCLUDED)
      .map(e => e.contentHash);

    const responseHash = this._hashResponse(response, contextHashes);
    const previousHash = this._entries.length > 0
      ? this._entries[this._entries.length - 1].hash
      : '0';

    const entryBase = {
      previousHash, itemId: '__llm_response__', source: 'llm_output',
      reason: 'llm_response', score: 1, contentHash: responseHash, timestamp: Date.now(),
    };
    const hash = this._hashEntry(entryBase);

    const entry: ProvenanceEntry = {
      id: randomUUID(),
      itemId: '__llm_response__',
      source: 'llm_output',
      sourceType: SourceType.LLM_OUTPUT,
      reason: 'llm_response',
      score: 1,
      contentHash: responseHash,
      sourceHash: this._hashSource('llm_output', SourceType.LLM_OUTPUT),
      metadata: { responseLength: response.length, model: this._llmModel },
      timestamp: Date.now(),
      previousHash,
      hash,
      sequence: this._entries.length + 1,
    };

    this._entries.push(entry);
  }

  getChain(): ProvenanceEntry[] {
    return [...this._entries];
  }

  getSessionId(): string {
    return this._sessionId;
  }

  generateReport(): {
    sessionId: string; timestamp: number; totalItems: number;
    included: number; excluded: number; chainValid: boolean;
    chainLength: number; tokensUsed: number; llmModel: string;
    bySource: Record<string, SourceStats>;
    topSources: Array<{ source: string; included: number; score: number }>;
  } {
    const included = this._entries.filter(e => e.reason === ProvenanceReason.INCLUDED);
    const excluded = this._entries.filter(
      e => e.reason !== ProvenanceReason.INCLUDED && e.reason !== 'llm_response',
    );
    const bySource = this._groupBySource(this._entries);

    return {
      sessionId: this._sessionId,
      timestamp: Date.now(),
      totalItems: this._entries.length,
      included: included.length,
      excluded: excluded.length,
      chainValid: this.verifyIntegrity(),
      chainLength: this._entries.length,
      tokensUsed: this._tokensUsed,
      llmModel: this._llmModel,
      bySource,
      topSources: Object.entries(bySource)
        .map(([source, stats]) => ({ source, included: stats.included, score: stats.totalScore }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 5),
    };
  }

  verifyIntegrity(): boolean {
    for (let i = 1; i < this._entries.length; i++) {
      const entry = this._entries[i];
      const prevEntry = this._entries[i - 1];

      const computed = this._hashEntry({
        previousHash: prevEntry.hash,
        itemId: entry.itemId,
        source: entry.source,
        reason: entry.reason,
        score: entry.score,
        contentHash: entry.contentHash,
        timestamp: entry.timestamp,
      });

      if (computed !== entry.hash) return false;
      if (entry.previousHash !== prevEntry.hash) return false;
    }
    return true;
  }

  reset(): void {
    this._entries = [];
    this._sessionId = randomUUID();
  }

  private _groupBySource(entries: ProvenanceEntry[]): Record<string, SourceStats> {
    const groups: Record<string, SourceStats> = {};
    for (const entry of entries) {
      if (!groups[entry.source]) {
        groups[entry.source] = { included: 0, excluded: 0, totalScore: 0, sources: [] };
      }
      if (entry.reason === ProvenanceReason.INCLUDED) {
        groups[entry.source].included++;
        groups[entry.source].totalScore += entry.score;
      } else {
        groups[entry.source].excluded++;
      }
      if (!groups[entry.source].sources.includes(entry.source)) {
        groups[entry.source].sources.push(entry.source);
      }
    }
    return groups;
  }

  private _hashContent(content: string): string {
    const normalized = content.replace(/\s+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
    return createHash('sha256').update(normalized).digest('hex');
  }

  private _hashSource(source: string, sourceType: SourceType): string {
    return createHash('sha256').update(sourceType + '::' + source).digest('hex');
  }

  private _hashEntry(entry: {
    previousHash: string; itemId: string; source: string;
    reason: string; score: number; contentHash: string; timestamp: number;
  }): string {
    const data = entry.itemId + entry.source + entry.reason + entry.score + entry.contentHash + entry.timestamp;
    return createHash('sha256').update(entry.previousHash + data).digest('hex');
  }

  private _hashResponse(response: string, contextHashes: string[]): string {
    const combined = response + [...contextHashes].sort().join('');
    return createHash('sha256').update(combined).digest('hex');
  }
}
