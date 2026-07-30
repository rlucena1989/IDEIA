import { createHash, randomBytes } from 'crypto';
import { createLogger } from '@ideia/logger';
import { PIIDetector, DEFAULT_PII_PATTERNS, type PIIPattern } from './pii-detector';
const logger = createLogger('anonymizer');

export type AnonymizationStrategy = 'mask' | 'redact' | 'hash' | 'generalize' | 'perturb' | 'tokenize';

export interface AnonymizationFieldConfig {
  fieldPath: string;
  strategy: AnonymizationStrategy;
  pattern?: PIIPattern;
  generalizationLevel?: number;
}

export interface AnonymizationConfig {
  strategies: AnonymizationFieldConfig[];
  maskingChar: string;
  hashSalt: string;
  tokenMap: Map<string, string>;
}

export interface AnonymizationResult<T = Record<string, unknown>> {
  original: T;
  anonymized: T;
  fieldsProcessed: string[];
  tokensGenerated: Array<{ original: string; token: string }>;
}

const DEFAULT_CONFIG: AnonymizationConfig = {
  strategies: [],
  maskingChar: '*',
  hashSalt: '',
  tokenMap: new Map(),
};

export class Anonymizer {
  private config: AnonymizationConfig;
  private detector: PIIDetector;

  constructor(config?: Partial<AnonymizationConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config, tokenMap: config?.tokenMap ?? new Map() };
    this.detector = new PIIDetector(DEFAULT_PII_PATTERNS);
  }

  setConfig(config: Partial<AnonymizationConfig>): void {
    this.config = { ...this.config, ...config, tokenMap: config?.tokenMap ?? this.config.tokenMap };
  }

  anonymizeObject<T extends Record<string, unknown>>(data: T): AnonymizationResult<T> {
    const anonymized = JSON.parse(JSON.stringify(data)) as T;
    const fieldsProcessed: string[] = [];
    const tokensGenerated: Array<{ original: string; token: string }> = [];

    for (const fieldConfig of this.config.strategies) {
      const value = this.getNestedValue(anonymized, fieldConfig.fieldPath);
      if (value === undefined || value === null) continue;

      let anonymizedValue: unknown;
      if (typeof value === 'string') {
        const result = this.applyStrategy(value, fieldConfig);
        anonymizedValue = result.value;
        tokensGenerated.push(...result.tokens);
      } else {
        anonymizedValue = value;
      }

      this.setNestedValue(anonymized, fieldConfig.fieldPath, anonymizedValue);
      fieldsProcessed.push(fieldConfig.fieldPath);
    }

    const strData = JSON.stringify(data);
    const matches = this.detector.detect(strData);
    if (matches.length > 0) {
      for (const match of matches) {
        const result = this.applyStrategy(match.value, { fieldPath: match.type, strategy: 'mask' });
        const anonymizedStr = JSON.stringify(anonymized);
        if (anonymizedStr.includes(match.value)) {
          const replaced = anonymizedStr.replace(new RegExp(this.escapeRegex(match.value), 'g'), result.value);
          try {
            const parsed = JSON.parse(replaced) as T;
            Object.assign(anonymized, parsed);
          } catch {
            // If replacement breaks JSON, skip
          }
        }
        tokensGenerated.push(...result.tokens);
        if (!fieldsProcessed.includes(match.type)) {
          fieldsProcessed.push(match.type);
        }
      }
    }

    return {
      original: JSON.parse(JSON.stringify(data)) as T,
      anonymized,
      fieldsProcessed: [...new Set(fieldsProcessed)],
      tokensGenerated,
    };
  }

  anonymizeText(text: string): { anonymized: string; tokensGenerated: Array<{ original: string; token: string }> } {
    let result = text;
    const tokensGenerated: Array<{ original: string; token: string }> = [];

    for (const fieldConfig of this.config.strategies) {
      const strategyResult = this.applyStrategy(result, fieldConfig);
      result = strategyResult.value;
      tokensGenerated.push(...strategyResult.tokens);
    }

    const matches = this.detector.detect(text);
    for (const match of matches) {
      const strategyResult = this.applyStrategy(match.value, { fieldPath: match.type, strategy: 'mask' });
      result = result.replace(new RegExp(this.escapeRegex(match.value), 'g'), strategyResult.value);
      tokensGenerated.push(...strategyResult.tokens);
    }

    return { anonymized: result, tokensGenerated };
  }

  deTokenize(token: string): string | undefined {
    for (const [original, tok] of this.config.tokenMap) {
      if (tok === token) return original;
    }
    return undefined;
  }

  resetTokens(): void {
    this.config.tokenMap.clear();
  }

  private applyStrategy(value: string, config: AnonymizationFieldConfig): { value: string; tokens: Array<{ original: string; token: string }> } {
    switch (config.strategy) {
      case 'mask': return { value: this.maskValue(value), tokens: [] };
      case 'redact': return { value: `[REDACTED]`, tokens: [] };
      case 'hash': return { value: this.hashValue(value), tokens: [] };
      case 'generalize': return { value: this.generalizeValue(value, config.generalizationLevel ?? 1), tokens: [] };
      case 'perturb': return { value: this.perturbValue(value), tokens: [] };
      case 'tokenize': return this.tokenizeValue(value);
      default: return { value, tokens: [] };
    }
  }

  private maskValue(value: string): string {
    if (value.length <= 4) return this.config.maskingChar.repeat(value.length);
    const prefix = value.length > 8 ? value.slice(0, 4) : value.slice(0, 2);
    const suffix = value.length > 8 ? value.slice(-4) : value.slice(-2);
    return prefix + this.config.maskingChar.repeat(value.length - prefix.length - suffix.length) + suffix;
  }

  private hashValue(value: string): string {
    const salted = value + this.config.hashSalt;
    return createHash('sha256').update(salted).digest('hex').slice(0, 16);
  }

  private generalizeValue(value: string, level: number): string {
    if (/^\d{5}-?\d{3}$/.test(value)) {
      return value.slice(0, 5 - level) + '*'.repeat(level + 3);
    }
    if (/^\d{3}\.\d{3}\.\d{3}-\d{2}$/.test(value)) {
      return `***.***.***-${value.slice(-2)}`;
    }
    if (value.includes('@')) {
      const [local, domain] = value.split('@');
      const maskedLocal = local.length > 2
        ? local.slice(0, Math.max(1, local.length - level)) + '*'.repeat(level)
        : '*'.repeat(local.length);
      return `${maskedLocal}@${domain}`;
    }
    if (value.length > 4) {
      return value.slice(0, Math.max(1, Math.floor(value.length / 2))) + '*'.repeat(Math.ceil(value.length / 2));
    }
    return value;
  }

  private perturbValue(value: string): string {
    const numMatch = value.match(/\d+/);
    if (!numMatch) return this.maskValue(value);
    const perturbed = String(Number(numMatch[0]) + Math.floor(Math.random() * 10) - 5);
    return value.replace(numMatch[0], perturbed);
  }

  private tokenizeValue(value: string): { value: string; tokens: Array<{ original: string; token: string }> } {
    const existingToken = this.config.tokenMap.get(value);
    if (existingToken) {
      return { value: existingToken, tokens: [] };
    }
    const token = `tok_${randomBytes(8).toString('hex')}`;
    this.config.tokenMap.set(value, token);
    return { value: token, tokens: [{ original: value, token }] };
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

  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}

export function createAnonymizer(config?: Partial<AnonymizationConfig>): Anonymizer {
  return new Anonymizer(config);
}
