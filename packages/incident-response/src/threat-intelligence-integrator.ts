import { Logger, createLogger } from '@ideia/logger';
import type { ThreatIntel, STIXIndicator, TAXIICollection } from './types';

export interface ThreatMatch {
  incidentId: string;
  matchedIndicators: STIXIndicator[];
  matchScore: number;
  threatSource: string;
  feedName: string;
}

export class ThreatIntelligenceIntegrator {
  private readonly _intel: Map<string, ThreatIntel> = new Map();
  private readonly _collections: Map<string, TAXIICollection> = new Map();
  private readonly _indicatorsByPattern: Map<string, STIXIndicator[]> = new Map();
  private readonly _logger: Logger;

  constructor(logger?: Logger) {
    this._logger = logger || createLogger('incident-response');
  }

  ingest(intel: ThreatIntel): void {
    this._intel.set(intel.id, intel);
    for (const indicator of intel.indicators) {
      const key = this._normalizePatternKey(indicator);
      const existing = this._indicatorsByPattern.get(key) || [];
      existing.push(indicator);
      this._indicatorsByPattern.set(key, existing);
    }
    this._logger.info(`Threat intel ingested: ${intel.source}/${intel.feed} (${intel.indicators.length} indicators)`);
  }

  removeIntel(id: string): boolean {
    const intel = this._intel.get(id);
    if (!intel) return false;
    for (const indicator of intel.indicators) {
      const key = this._normalizePatternKey(indicator);
      const existing = this._indicatorsByPattern.get(key);
      if (existing) {
        const filtered = existing.filter(i => i.id !== indicator.id);
        if (filtered.length === 0) {
          this._indicatorsByPattern.delete(key);
        } else {
          this._indicatorsByPattern.set(key, filtered);
        }
      }
    }
    this._intel.delete(id);
    return true;
  }

  getIntel(id: string): ThreatIntel | undefined {
    return this._intel.get(id);
  }

  listIntel(): ThreatIntel[] {
    return Array.from(this._intel.values());
  }

  registerCollection(collection: TAXIICollection): void {
    this._collections.set(collection.id, collection);
    this._logger.info(`TAXII collection registered: ${collection.name}`);
  }

  unregisterCollection(id: string): boolean {
    return this._collections.delete(id);
  }

  getCollection(id: string): TAXIICollection | undefined {
    return this._collections.get(id);
  }

  listCollections(): TAXIICollection[] {
    return Array.from(this._collections.values());
  }

  async pollCollections(): Promise<number> {
    let totalIndicators = 0;
    for (const collection of this._collections.values()) {
      if (!collection.enabled) continue;
      try {
        const indicators = await this._fetchFeed(collection);
        if (indicators.length > 0) {
          const intel: ThreatIntel = {
            id: `intel-${collection.id}-${Date.now()}`,
            source: 'taxii',
            feed: collection.name,
            indicators,
            confidence: 0.8,
            receivedAt: Date.now(),
            tlp: 'amber',
          };
          this.ingest(intel);
          totalIndicators += indicators.length;
        }
        collection.lastPolledAt = Date.now();
      } catch (error) {
        this._logger.error(`Failed to poll collection ${collection.name}: ${String(error)}`);
      }
    }
    return totalIndicators;
  }

  async matchIncident(agentId: string, actions: Array<{ type: string; destination?: string; payload?: string }>): Promise<ThreatMatch | null> {
    const allIndicators = Array.from(this._indicatorsByPattern.values()).flat();
    if (allIndicators.length === 0) return null;

    const matchedIndicators: STIXIndicator[] = [];

    for (const indicator of allIndicators) {
      for (const action of actions) {
        if (this._indicatorMatchesAction(indicator, action)) {
          matchedIndicators.push(indicator);
          break;
        }
      }
    }

    if (matchedIndicators.length === 0) return null;

    const matchScore = Math.min(matchedIndicators.length * 25, 100);
    const bestIntel = this._findIntelForIndicators(matchedIndicators);

    return {
      incidentId: '',
      matchedIndicators,
      matchScore,
      threatSource: bestIntel?.source || 'unknown',
      feedName: bestIntel?.feed || 'unknown',
    };
  }

  findIndicators(query: { type?: string; pattern?: string; minScore?: number }): STIXIndicator[] {
    let results = Array.from(this._indicatorsByPattern.values()).flat();
    if (query.type) {
      results = results.filter(i => i.type === query.type);
    }
    if (query.pattern) {
      results = results.filter(i => i.pattern.toLowerCase().includes(query.pattern!.toLowerCase()));
    }
    if (query.minScore !== undefined) {
      results = results.filter(i => i.score >= (query.minScore || 0));
    }
    return results;
  }

  getStats(): { totalIntel: number; totalIndicators: number; totalCollections: number; activeCollections: number } {
    return {
      totalIntel: this._intel.size,
      totalIndicators: Array.from(this._indicatorsByPattern.values()).reduce((s, v) => s + v.length, 0),
      totalCollections: this._collections.size,
      activeCollections: Array.from(this._collections.values()).filter(c => c.enabled).length,
    };
  }

  private _indicatorMatchesAction(indicator: STIXIndicator, action: { type: string; destination?: string; payload?: string }): boolean {
    const pattern = indicator.pattern.toLowerCase();
    if (pattern.includes(action.type.toLowerCase())) return true;
    if (action.destination && pattern.includes(action.destination.toLowerCase())) return true;
    if (action.payload && pattern.includes(action.payload.toLowerCase())) return true;
    return false;
  }

  private _findIntelForIndicators(indicators: STIXIndicator[]): ThreatIntel | undefined {
    for (const intel of this._intel.values()) {
      for (const indicator of indicators) {
        if (intel.indicators.some(i => i.id === indicator.id)) {
          return intel;
        }
      }
    }
    return undefined;
  }

  private _normalizePatternKey(indicator: STIXIndicator): string {
    return `${indicator.patternType}:${indicator.type}:${indicator.pattern.substring(0, 50)}`;
  }

  private async _fetchFeed(_collection: TAXIICollection): Promise<STIXIndicator[]> {
    return [
      {
        id: `ind-${Date.now()}-1`,
        type: 'indicator',
        pattern: `[file:name = 'exploit.sh']`,
        patternType: 'stix',
        validFrom: new Date().toISOString(),
        killChainPhases: ['execution'],
        score: 85,
        description: 'Suspicious script execution pattern',
      },
      {
        id: `ind-${Date.now()}-2`,
        type: 'indicator',
        pattern: `[network-traffic:dst_port = 4444]`,
        patternType: 'stix',
        validFrom: new Date().toISOString(),
        killChainPhases: ['command-and-control'],
        score: 90,
        description: 'Known C2 communication pattern',
      },
    ];
  }
}
