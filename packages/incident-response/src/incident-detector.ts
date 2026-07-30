import { Logger, createLogger } from '@ideia/logger';
import type { DetectionSource, Incident, IncidentSeverity, IncidentType } from './types';

export interface DetectorConfig {
  name: string;
  source: DetectionSource;
  confidence: number;
}

export interface DetectionResult {
  detectorName: string;
  source: DetectionSource;
  confidence: number;
  evidence: string[];
  timestamp: number;
  suggestedSeverity: IncidentSeverity;
  suggestedType: IncidentType;
}

export interface AggregatedDetection {
  detected: boolean;
  confidence: number;
  severity: IncidentSeverity;
  type: IncidentType;
  sources: DetectionSource[];
  evidence: string[];
  timestamp: number;
}

export interface Detector {
  readonly name: string;
  readonly source: DetectionSource;
  readonly confidence: number;
  detect(input: DetectionInput): Promise<DetectionResult | null>;
}

export interface DetectionInput {
  agentId: string;
  actions: Array<{ type: string; destination?: string; payload?: string }>;
  filesAffected: string[];
  agentsAffected: number;
  violationCount: number;
  pattern?: string;
  llmPrompt?: string;
  llmResponse?: string;
  source?: DetectionSource;
  context?: Record<string, unknown>;
}

export class PromptInjectionDetector implements Detector {
  readonly name = 'PromptInjectionDetector';
  readonly source: DetectionSource = 'llm-guard';
  readonly confidence = 0.85;

  private readonly _injectionPatterns: RegExp[] = [
    /ignore\s+(all\s+)?(prior|previous|above)\s+instructions/i,
    /forget\s+(all\s+)?(your|previous)\s+(instructions|rules|constraints)/i,
    /you\s+(are\s+)?(now|will\s+act\s+as)\s+(DAN|jailbreak|free|ungoverned)/i,
    /system\s+prompt/i,
    /output\s+your\s+(system\s+)?prompt/i,
    /role\s+play/i,
    /hypothetical.*(scenario|situation)/i,
    /act\s+as\s+if/i,
    /do\s+(not\s+)?(anything|whatever|anyone)\s+tells?\s+you/i,
    /you\s+have\s+been\s+(released|freed|unlocked)/i,
  ];

  async detect(input: DetectionInput): Promise<DetectionResult | null> {
    const prompt = input.llmPrompt || '';
    const response = input.llmResponse || '';
    const combined = `${prompt}\n${response}`;
    const matches: string[] = [];
    for (const pattern of this._injectionPatterns) {
      if (pattern.test(combined)) {
        matches.push(pattern.source);
      }
    }
    if (matches.length === 0) return null;
    return {
      detectorName: this.name,
      source: this.source,
      confidence: Math.min(0.5 + matches.length * 0.15, 0.95),
      evidence: matches,
      timestamp: Date.now(),
      suggestedSeverity: matches.length >= 3 ? 'P0' : 'P1',
      suggestedType: 'intrusion',
    };
  }
}

export class DataLeakageDetector implements Detector {
  readonly name = 'DataLeakageDetector';
  readonly source: DetectionSource = 'llm-guard';
  readonly confidence = 0.9;

  private readonly _piiPatterns: RegExp[] = [
    /\b\d{3}\.\d{3}\.\d{3}-\d{2}\b/,
    /\b\d{3}-\d{2}-\d{4}\b/,
    /\b(?:\d{4}[-\s]?){3}\d{4}\b/,
    /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/,
    /\b(?:\d{1,3}\.){3}\d{1,3}\b/,
    /(?:api[_-]?key|secret|token|password|credential)/i,
    /-----BEGIN\s+(RSA\s+)?PRIVATE\s+KEY-----/,
    /ghp_[A-Za-z0-9]{36}/,
    /sk-[A-Za-z0-9]{32,48}/,
  ];

  async detect(input: DetectionInput): Promise<DetectionResult | null> {
    const response = input.llmResponse || '';
    const matches: string[] = [];
    for (const pattern of this._piiPatterns) {
      const found = response.match(pattern);
      if (found) {
        matches.push(`${pattern.source}: ${found[0].substring(0, 20)}...`);
      }
    }
    if (matches.length === 0) return null;
    return {
      detectorName: this.name,
      source: this.source,
      confidence: Math.min(0.6 + matches.length * 0.1, 0.98),
      evidence: matches,
      timestamp: Date.now(),
      suggestedSeverity: matches.some(m => m.includes('PRIVATE KEY') || m.includes('ghp_')) ? 'P0' : 'P1',
      suggestedType: 'data_breach',
    };
  }
}

export class JailbreakDetector implements Detector {
  readonly name = 'JailbreakDetector';
  readonly source: DetectionSource = 'llm-guard';
  readonly confidence = 0.88;

  private readonly _jailbreakPatterns: RegExp[] = [
    /you\s+(are|will\s+now)\s+(DAN|STAN|DUDE|CHAD|dev\s+mode|developer\s+mode)/i,
    /no\s+(filters|restrictions|limits|boundaries|rules)/i,
    /bypass\s+(the\s+)?(safety|filter|guardrail|restriction)/i,
    /hypothetical.*(no\s+longer|without)\s+(restrictions|limits)/i,
    /this\s+is\s+(for\s+)?(educational|research|academic)\s+(purposes|reasons)/i,
    /uncensored\s+(output|mode|version|response)/i,
    /remove\s+(all\s+)?(ethics|morals|alignment|safety|guardrails)/i,
  ];

  async detect(input: DetectionInput): Promise<DetectionResult | null> {
    const prompt = input.llmPrompt || '';
    const matches: string[] = [];
    for (const pattern of this._jailbreakPatterns) {
      if (pattern.test(prompt)) {
        matches.push(pattern.source);
      }
    }
    if (matches.length === 0) return null;
    return {
      detectorName: this.name,
      source: this.source,
      confidence: Math.min(0.6 + matches.length * 0.12, 0.96),
      evidence: matches,
      timestamp: Date.now(),
      suggestedSeverity: matches.length >= 2 ? 'P0' : 'P1',
      suggestedType: 'intrusion',
    };
  }
}

export class ModelPoisoningDetector implements Detector {
  readonly name = 'ModelPoisoningDetector';
  readonly source: DetectionSource = 'llm-guard';
  readonly confidence = 0.75;

  private readonly _poisoningIndicators: RegExp[] = [
    /output\s+(only|just|exclusively)\s+(the\s+)?(word|number|letter)/i,
    /respond\s+with\s+(exactly|only|just)/i,
    /repeat\s+(after\s+me|the\s+(word|phrase|text))/i,
    /learn\s+(this|the\s+following)\s+(pattern|behavior|rule)/i,
    /from\s+now\s+on,\s+(always|never)/i,
  ];

  async detect(input: DetectionInput): Promise<DetectionResult | null> {
    const prompt = input.llmPrompt || '';
    const matches: string[] = [];
    for (const indicator of this._poisoningIndicators) {
      if (indicator.test(prompt)) {
        matches.push(indicator.source);
      }
    }
    if (matches.length < 2 || input.violationCount <= 1) return null;
    return {
      detectorName: this.name,
      source: this.source,
      confidence: Math.min(0.5 + matches.length * 0.15 + input.violationCount * 0.05, 0.85),
      evidence: matches,
      timestamp: Date.now(),
      suggestedSeverity: input.violationCount > 5 ? 'P0' : 'P1',
      suggestedType: 'intrusion',
    };
  }
}

export class IncidentDetector {
  private readonly _detectors: Map<string, Detector> = new Map();
  private readonly _logger: Logger;

  constructor(logger?: Logger) {
    this._logger = logger || createLogger('incident-response');
  }

  register(detector: Detector): void {
    this._detectors.set(detector.name, detector);
    this._logger.info(`IncidentDetector registered: ${detector.name} (${detector.source})`);
  }

  unregister(name: string): boolean {
    return this._detectors.delete(name);
  }

  getDetector(name: string): Detector | undefined {
    return this._detectors.get(name);
  }

  listDetectors(): Detector[] {
    return Array.from(this._detectors.values());
  }

  async analyze(input: DetectionInput): Promise<AggregatedDetection> {
    const results: DetectionResult[] = [];
    for (const detector of this._detectors.values()) {
      try {
        const result = await detector.detect(input);
        if (result) {
          results.push(result);
        }
      } catch (error) {
        this._logger.error(`Detector ${detector.name} failed: ${String(error)}`);
      }
    }
    return this._aggregate(results);
  }

  async analyzeAndCreateIncident(input: DetectionInput): Promise<Incident | null> {
    const detection = await this.analyze(input);
    if (!detection.detected) return null;
    return {
      id: this._generateId(),
      severity: detection.severity,
      type: detection.type,
      status: 'detection',
      title: `[${detection.severity}] ${detection.type} detected by ${detection.sources.join(',')}`,
      description: `Detection confidence: ${(detection.confidence * 100).toFixed(1)}%. Evidence: ${detection.evidence.join(', ')}`,
      timestamp: detection.timestamp,
      detectedAt: detection.timestamp,
      agentId: input.agentId,
      source: detection.sources[0] || 'policy',
      violationType: input.pattern || detection.type,
      violationCount: input.violationCount,
      actions: [],
      tags: [`source:${detection.sources.join(',')}`, `confidence:${(detection.confidence * 100).toFixed(0)}`],
    };
  }

  private _aggregate(results: DetectionResult[]): AggregatedDetection {
    if (results.length === 0) {
      return {
        detected: false,
        confidence: 0,
        severity: 'P4',
        type: 'intrusion',
        sources: [],
        evidence: [],
        timestamp: Date.now(),
      };
    }
    const avgConfidence = results.reduce((s, r) => s + r.confidence, 0) / results.length;
    const sources = [...new Set(results.map(r => r.source))];
    const evidence = results.flatMap(r => r.evidence);

    const severityScores: Record<IncidentSeverity, number> = { P0: 0, P1: 0, P2: 0, P3: 0, P4: 0 };
    const typeScores: Record<string, number> = {};
    for (const r of results) {
      severityScores[r.suggestedSeverity] = (severityScores[r.suggestedSeverity] || 0) + r.confidence;
      typeScores[r.suggestedType] = (typeScores[r.suggestedType] || 0) + r.confidence;
    }
    const topSeverity = (Object.entries(severityScores) as [IncidentSeverity, number][]).sort((a, b) => b[1] - a[1])[0][0];
    const topType = (Object.entries(typeScores) as [string, number][]).sort((a, b) => b[1] - a[1])[0][0] as IncidentType;

    return {
      detected: avgConfidence > 0.3,
      confidence: avgConfidence,
      severity: topSeverity,
      type: topType,
      sources,
      evidence,
      timestamp: Date.now(),
    };
  }

  private _generateId(): string {
    return `inc-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
  }
}
