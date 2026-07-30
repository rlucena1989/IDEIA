import { createLogger } from '@ideia/logger';
import { Anonymizer, AnonymizationResult } from './anonymizer';
import { PIIDetector, PIIMatch } from './pii-detector';

const logger = createLogger('privacy:anonymization-pipeline');

export type PipelineStage = 'detect' | 'anonymize' | 'validate' | 'log';

export interface PipelineConfig {
  stages: PipelineStage[];
  failOnUnsafeOutput: boolean;
  logAnonymized: boolean;
  blockUntokenizable: boolean;
}

export interface PipelineResult {
  inputSize: number;
  outputSize: number;
  piiDetected: number;
  piiAnonymized: number;
  fieldsProcessed: string[];
  unsafeOutput: boolean;
  durationMs: number;
}

export interface AnonymizationReport {
  totalReplacements: number;
  rulesApplied: { name: string; count: number }[];
  originalLength: number;
  anonymizedLength: number;
}

interface AnonymizationRule {
  name: string;
  pattern: RegExp;
  replacement: string;
}

const DEFAULT_RULES: AnonymizationRule[] = [
  { name: 'credit_card', pattern: /(?:\d{4}[-\s]?){3}\d{4}/g, replacement: '****-****-****-****' },
  { name: 'email', pattern: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, replacement: '***@***' },
  { name: 'cpf', pattern: /\d{3}\.\d{3}\.\d{3}-\d{2}/g, replacement: '***.***.***-**' },
  { name: 'phone', pattern: /(?:\+?\d{1,3}[-.\s]?)?\(?\d{2,3}\)?[-.\s]?\d{4,5}[-.\s]?\d{4}/g, replacement: '****-****' },
  { name: 'ip_address', pattern: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g, replacement: '*.*.*.*' },
  { name: 'api_key', pattern: /(?:api[_-]?key|apikey|secret[_-]?key)['"]?\s*[:=]\s*['"]?\w{16,}/gi, replacement: '[REDACTED]' },
];

export class AnonymizationPipeline {
  private anonymizer: Anonymizer;
  private detector: PIIDetector;
  private config: PipelineConfig;
  private processedCount = 0;
  private totalPiiDetected = 0;
  private rules: AnonymizationRule[] = [];
  private cumulativeReport: AnonymizationReport = { totalReplacements: 0, rulesApplied: [], originalLength: 0, anonymizedLength: 0 };

  constructor(
    anonymizer: Anonymizer,
    detector: PIIDetector,
    config?: Partial<PipelineConfig>,
  ) {
    this.anonymizer = anonymizer;
    this.detector = detector;
    this.config = {
      stages: ['detect', 'anonymize', 'validate', 'log'],
      failOnUnsafeOutput: true,
      logAnonymized: true,
      blockUntokenizable: false,
      ...config,
    };
    this.rules = [...DEFAULT_RULES];
  }

  static createWithDefaultRules(): AnonymizationPipeline {
    return new AnonymizationPipeline(new Anonymizer(), new PIIDetector());
  }

  addRule(name: string, pattern: RegExp, replacement: string): void {
    const existing = this.rules.findIndex(r => r.name === name);
    if (existing >= 0) {
      this.rules[existing] = { name, pattern, replacement };
    } else {
      this.rules.push({ name, pattern, replacement });
    }
  }

  anonymize(text: string): { text: string; report: AnonymizationReport } {
    let result = text;
    const rulesApplied: { name: string; count: number }[] = [];
    let totalReplacements = 0;

    for (const rule of this.rules) {
      const regex = new RegExp(rule.pattern.source, 'g');
      const matches = result.match(regex);
      const count = matches ? matches.length : 0;
      if (count > 0) {
        result = result.replace(regex, rule.replacement);
        rulesApplied.push({ name: rule.name, count });
        totalReplacements += count;
      }
    }

    const report: AnonymizationReport = {
      totalReplacements,
      rulesApplied,
      originalLength: text.length,
      anonymizedLength: result.length,
    };

    this.cumulativeReport = {
      totalReplacements: this.cumulativeReport.totalReplacements + totalReplacements,
      rulesApplied: this.mergeRulesApplied(this.cumulativeReport.rulesApplied, rulesApplied),
      originalLength: this.cumulativeReport.originalLength + text.length,
      anonymizedLength: this.cumulativeReport.anonymizedLength + result.length,
    };

    return { text: result, report };
  }

  anonymizeJson(data: Record<string, unknown>, sensitiveFields: string[]): { data: Record<string, unknown>; report: AnonymizationReport } {
    const result = JSON.parse(JSON.stringify(data)) as Record<string, unknown>;
    let totalReplacements = 0;
    const rulesApplied: { name: string; count: number }[] = [];

    for (const field of sensitiveFields) {
      const value = this.getNestedValue(result, field);
      if (typeof value !== 'string') continue;

      let fieldValue = value;
      for (const rule of this.rules) {
        const regex = new RegExp(rule.pattern.source, 'g');
        const matches = fieldValue.match(regex);
        const count = matches ? matches.length : 0;
        if (count > 0) {
          fieldValue = fieldValue.replace(regex, rule.replacement);
          const existing = rulesApplied.find(r => r.name === rule.name);
          if (existing) {
            existing.count += count;
          } else {
            rulesApplied.push({ name: rule.name, count });
          }
          totalReplacements += count;
        }
      }
      this.setNestedValue(result, field, fieldValue);
    }

    const report: AnonymizationReport = {
      totalReplacements,
      rulesApplied,
      originalLength: JSON.stringify(data).length,
      anonymizedLength: JSON.stringify(result).length,
    };

    this.cumulativeReport = {
      totalReplacements: this.cumulativeReport.totalReplacements + totalReplacements,
      rulesApplied: this.mergeRulesApplied(this.cumulativeReport.rulesApplied, rulesApplied),
      originalLength: this.cumulativeReport.originalLength + JSON.stringify(data).length,
      anonymizedLength: this.cumulativeReport.anonymizedLength + JSON.stringify(result).length,
    };

    return { data: result, report };
  }

  getReport(): AnonymizationReport {
    return {
      totalReplacements: this.cumulativeReport.totalReplacements,
      rulesApplied: [...this.cumulativeReport.rulesApplied],
      originalLength: this.cumulativeReport.originalLength,
      anonymizedLength: this.cumulativeReport.anonymizedLength,
    };
  }

  private mergeRulesApplied(
    existing: { name: string; count: number }[],
    incoming: { name: string; count: number }[],
  ): { name: string; count: number }[] {
    const merged = [...existing.map(e => ({ ...e }))];
    for (const inc of incoming) {
      const found = merged.find(m => m.name === inc.name);
      if (found) {
        found.count += inc.count;
      } else {
        merged.push({ ...inc });
      }
    }
    return merged;
  }

  private getNestedValue(obj: Record<string, unknown>, path: string): unknown {
    const parts = path.split('.');
    let current: unknown = obj;
    for (const part of parts) {
      if (current === null || current === undefined || typeof current !== 'object') return undefined;
      current = (current as Record<string, unknown>)[part];
    }
    return current;
  }

  private setNestedValue(obj: Record<string, unknown>, path: string, value: unknown): void {
    const parts = path.split('.');
    let current = obj;
    for (let i = 0; i < parts.length - 1; i++) {
      if (!current[parts[i]] || typeof current[parts[i]] !== 'object') {
        current[parts[i]] = {};
      }
      current = current[parts[i]] as Record<string, unknown>;
    }
    current[parts[parts.length - 1]] = value;
  }

  async process<T extends Record<string, unknown>>(data: T): Promise<AnonymizationResult<T> & { pipeline: PipelineResult }> {
    const start = Date.now();
    const inputSize = JSON.stringify(data).length;

    const piiMatches: PIIMatch[] = this.config.stages.includes('detect')
      ? this.detector.detect(JSON.stringify(data))
      : [];

    let anonymized: T;
    let fieldsProcessed: string[] = [];
    let tokensGenerated: Array<{ original: string; token: string }> = [];

    if (this.config.stages.includes('anonymize') && piiMatches.length > 0) {
      const result = this.anonymizer.anonymizeObject(data);
      anonymized = result.anonymized;
      fieldsProcessed = result.fieldsProcessed;
      tokensGenerated = result.tokensGenerated;
    } else {
      anonymized = JSON.parse(JSON.stringify(data)) as T;
    }

    if (this.config.stages.includes('validate')) {
      const outputStr = JSON.stringify(anonymized);
      const remainingPii = this.detector.detect(outputStr);
      if (remainingPii.length > 0 && this.config.failOnUnsafeOutput) {
        logger.error('Unsafe output detected after anonymization', {
          remainingPii: remainingPii.map(p => p.type),
        });
        throw new Error(`Anonymization pipeline: unsafe output - ${remainingPii.length} PII entities remaining`);
      }
    }

    const outputSize = JSON.stringify(anonymized).length;
    const piiAnonymized = piiMatches.length - (this.config.stages.includes('validate')
      ? this.detector.detect(JSON.stringify(anonymized)).length
      : 0);

    this.processedCount++;
    this.totalPiiDetected += piiMatches.length;

    if (this.config.stages.includes('log') && this.config.logAnonymized) {
      logger.info('Data anonymized', {
        piiDetected: piiMatches.length,
        piiAnonymized,
        fields: fieldsProcessed.length,
        inputSize,
        outputSize,
      });
    }

    return {
      original: data,
      anonymized,
      fieldsProcessed,
      tokensGenerated,
      pipeline: {
        inputSize,
        outputSize,
        piiDetected: piiMatches.length,
        piiAnonymized,
        fieldsProcessed,
        unsafeOutput: false,
        durationMs: Date.now() - start,
      },
    };
  }

  async processStream<T extends Record<string, unknown>>(
    items: T[],
    onProgress?: (processed: number, total: number) => void,
  ): Promise<Array<AnonymizationResult<T> & { pipeline: PipelineResult }>> {
    const results: Array<AnonymizationResult<T> & { pipeline: PipelineResult }> = [];
    for (let i = 0; i < items.length; i++) {
      const result = await this.process(items[i]);
      results.push(result);
      if (onProgress) onProgress(i + 1, items.length);
    }
    return results;
  }

  getStats(): { processedCount: number; totalPiiDetected: number } {
    return {
      processedCount: this.processedCount,
      totalPiiDetected: this.totalPiiDetected,
    };
  }

  setAnonymizer(anonymizer: Anonymizer): void {
    this.anonymizer = anonymizer;
  }

  reset(): void {
    this.processedCount = 0;
    this.totalPiiDetected = 0;
    this.cumulativeReport = { totalReplacements: 0, rulesApplied: [], originalLength: 0, anonymizedLength: 0 };
  }
}
