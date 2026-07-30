import crypto from 'crypto';
import { createLogger } from '@ideia/logger';
import { PatternDetector, DetectedPattern } from './pattern-detector';
const logger = createLogger('decision-analyzer');

export interface AnalyzedDecision {
  id: string;
  text: string;
  timestamp: string;
  action: string;
  source: string;
  outcome?: string;
  confidence: number;
  metadata?: Record<string, unknown>;
}

export interface DecisionPattern {
  id: string;
  name: string;
  frequency: number;
  confidence: number;
  firstSeen: string;
  lastSeen: string;
  typicalAction: string;
  sampleDecisions: string[];
  source: 'statistical' | 'llm';
}

export interface DecisionAnalysis {
  patterns: DecisionPattern[];
  totalDecisions: number;
  uniquePatterns: number;
  topPatterns: DecisionPattern[];
  analysisTimestamp: string;
}

export class DecisionAnalyzer {
  private decisions: AnalyzedDecision[] = [];
  private patterns: DecisionPattern[] = [];
  private detector: PatternDetector;
  private dirty = false;

  constructor(detector?: PatternDetector) {
    this.detector = detector ?? new PatternDetector();
  }

  recordDecision(decision: Omit<AnalyzedDecision, 'id' | 'timestamp'>): AnalyzedDecision {
    const full: AnalyzedDecision = {
      ...decision,
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
    };
    this.decisions.push(full);
    this.dirty = true;
    this.detector.record(decision.text, { action: decision.action, source: decision.source, outcome: decision.outcome });
    if (this.decisions.length > 10000) {
      this.decisions = this.decisions.slice(-5000);
    }
    return full;
  }

  analyze(): DecisionAnalysis {
    const detected = this.detector.detect();
    this.patterns = this.mergePatterns(detected);
    const sorted = [...this.patterns].sort((a, b) => b.frequency - a.frequency);
    return {
      patterns: this.patterns,
      totalDecisions: this.decisions.length,
      uniquePatterns: this.patterns.length,
      topPatterns: sorted.slice(0, 10),
      analysisTimestamp: new Date().toISOString(),
    };
  }

  async analyzeWithLLM(): Promise<DecisionAnalysis> {
    const llmPatterns = await this.detector.detectWithLLM(this.decisions.map(d => d.text));
    this.patterns = this.mergePatterns(llmPatterns);
    const sorted = [...this.patterns].sort((a, b) => b.frequency - a.frequency);
    return {
      patterns: this.patterns,
      totalDecisions: this.decisions.length,
      uniquePatterns: this.patterns.length,
      topPatterns: sorted.slice(0, 10),
      analysisTimestamp: new Date().toISOString(),
    };
  }

  getDecisions(): AnalyzedDecision[] {
    return [...this.decisions];
  }

  getDecisionsBySource(source: string): AnalyzedDecision[] {
    return this.decisions.filter(d => d.source === source);
  }

  getDecisionsByAction(action: string): AnalyzedDecision[] {
    return this.decisions.filter(d => d.action === action);
  }

  getRecentDecisions(count = 20): AnalyzedDecision[] {
    return [...this.decisions].reverse().slice(0, count);
  }

  getPatterns(): DecisionPattern[] {
    return [...this.patterns];
  }

  clear(): void {
    this.decisions = [];
    this.patterns = [];
    this.detector.clear();
    this.dirty = true;
  }

  isDirty(): boolean {
    return this.dirty;
  }

  get decisionCount(): number {
    return this.decisions.length;
  }

  private mergePatterns(detected: DetectedPattern[]): DecisionPattern[] {
    const map = new Map<string, DecisionPattern>();
    for (const p of this.patterns) {
      map.set(p.name, p);
    }
    for (const dp of detected) {
      const existing = map.get(dp.name);
      if (existing) {
        existing.frequency = dp.frequency;
        existing.confidence = Math.max(existing.confidence, dp.confidence);
        existing.lastSeen = dp.lastSeen;
        existing.source = dp.source ?? existing.source;
      } else {
        map.set(dp.name, {
          id: dp.id,
          name: dp.name,
          frequency: dp.frequency,
          confidence: dp.confidence,
          firstSeen: dp.firstSeen,
          lastSeen: dp.lastSeen,
          typicalAction: '',
          sampleDecisions: [],
          source: dp.source ?? 'statistical',
        });
      }
    }
    return Array.from(map.values()).sort((a, b) => b.frequency - a.frequency);
  }
}

export function createDecisionAnalyzer(detector?: PatternDetector): DecisionAnalyzer {
  return new DecisionAnalyzer(detector);
}
