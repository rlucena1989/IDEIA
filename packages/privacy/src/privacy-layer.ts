import { createHash } from 'crypto';
import { createLogger } from '@ideia/logger';
import { PIIDetector, DEFAULT_PII_PATTERNS, type PIIPattern } from './pii-detector';
import { DataRetentionManager, type RetentionRule } from './retention';
const logger = createLogger('privacy-layer');

export interface PrivacyConfig {
  enabled: boolean;
  logSanitization: boolean;
  maskingChar: string;
  policies: PrivacyPolicy[];
  retentionRules: RetentionRule[];
}

export interface PrivacyPolicy {
  id: string;
  name: string;
  description: string;
  patterns: PIIPattern[];
  action: 'mask' | 'redact' | 'hash' | 'block';
  appliesTo: string[];
}

export interface PIIEntity {
  type: string;
  value: string;
  start: number;
  end: number;
}

export interface SanitizationResult {
  original: string;
  sanitized: string;
  entitiesFound: PIIEntity[];
  entitiesMasked: number;
  policyApplied: string[];
}

export interface DataRetentionPolicy {
  maxAgeDays: number;
  purgeOnExpiry: boolean;
  notifyBeforeDays: number;
  exemptDomains: string[];
}

export const DEFAULT_PII_POLICIES: PrivacyPolicy[] = [
  { id: 'pii-cpf', name: 'CPF (Brazil)', description: 'Redact Brazilian CPF numbers', patterns: DEFAULT_PII_PATTERNS.filter(p => p.name === 'cpf'), action: 'redact', appliesTo: ['*'] },
  { id: 'pii-cnpj', name: 'CNPJ (Brazil)', description: 'Redact Brazilian CNPJ numbers', patterns: DEFAULT_PII_PATTERNS.filter(p => p.name === 'cnpj'), action: 'redact', appliesTo: ['*'] },
  { id: 'pii-ssn', name: 'SSN (US)', description: 'Redact US Social Security Numbers', patterns: DEFAULT_PII_PATTERNS.filter(p => p.name === 'ssn'), action: 'redact', appliesTo: ['*'] },
  { id: 'pii-creditcard', name: 'Credit Card', description: 'Redact credit card numbers', patterns: DEFAULT_PII_PATTERNS.filter(p => p.name === 'credit_card'), action: 'redact', appliesTo: ['*'] },
  { id: 'pii-email', name: 'Email', description: 'Mask email addresses', patterns: DEFAULT_PII_PATTERNS.filter(p => p.name === 'email'), action: 'mask', appliesTo: ['*'] },
  { id: 'pii-phone', name: 'Phone', description: 'Mask phone numbers (BR, UK, FR, DE, JP, IN)', patterns: DEFAULT_PII_PATTERNS.filter(p => p.name === 'phone' || p.name.endsWith('_phone')), action: 'mask', appliesTo: ['*'] },
  { id: 'pii-ip', name: 'IP Address', description: 'Mask IP addresses', patterns: DEFAULT_PII_PATTERNS.filter(p => p.name === 'ip_address'), action: 'mask', appliesTo: ['*'] },
  { id: 'pii-credential', name: 'Credentials', description: 'Hash API keys, tokens, passwords, JWT', patterns: DEFAULT_PII_PATTERNS.filter(p => p.category === 'credential'), action: 'hash', appliesTo: ['*'] },
  { id: 'pii-governmental', name: 'Governmental IDs', description: 'Redact governmental IDs (UK NI, IN Aadhaar, CN ID)', patterns: DEFAULT_PII_PATTERNS.filter(p => p.category === 'governmental' && !['cpf', 'cnpj', 'ssn'].includes(p.name)), action: 'redact', appliesTo: ['*'] },
  { id: 'pii-financial', name: 'Financial data', description: 'Redact IBAN, SWIFT/BIC, EU VAT, IN GST', patterns: DEFAULT_PII_PATTERNS.filter(p => p.category === 'financial' && p.name !== 'credit_card'), action: 'redact', appliesTo: ['*'] },
  { id: 'pii-contact', name: 'Contact info', description: 'Mask other contact info', patterns: DEFAULT_PII_PATTERNS.filter(p => p.category === 'contact' && p.name === 'phone'), action: 'mask', appliesTo: ['*'] },
  { id: 'pii-network', name: 'Network info', description: 'Mask other network info', patterns: DEFAULT_PII_PATTERNS.filter(p => p.category === 'network'), action: 'mask', appliesTo: ['*'] },
  { id: 'pii-address', name: 'Address info', description: 'Mask postal codes (CEP)', patterns: DEFAULT_PII_PATTERNS.filter(p => p.category === 'address'), action: 'mask', appliesTo: ['*'] },
];

export const DEFAULT_PRIVACY_CONFIG: PrivacyConfig = {
  enabled: true,
  logSanitization: true,
  maskingChar: '*',
  policies: DEFAULT_PII_POLICIES,
  retentionRules: [],
};

const DEFAULT_CONFIG: PrivacyConfig = {
  enabled: true,
  logSanitization: true,
  maskingChar: '*',
  policies: DEFAULT_PII_POLICIES,
  retentionRules: [],
};

export class PrivacyLayer {
  private config: PrivacyConfig;
  private detector: PIIDetector;
  private retention: DataRetentionManager;

  constructor(config?: Partial<PrivacyConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    const patterns = this.config.policies.flatMap(p => p.patterns);
    this.detector = new PIIDetector(patterns.length > 0 ? patterns : DEFAULT_PII_PATTERNS);
    this.retention = new DataRetentionManager(this.config.retentionRules);
  }

  sanitize(text: string, context?: string): SanitizationResult {
    if (text == null) {
      throw new Error('text cannot be null or undefined');
    }
    if (!this.config.enabled) {
      return { original: text, sanitized: text, entitiesFound: [], entitiesMasked: 0, policyApplied: [] };
    }

    const matches = this.detector.detect(text);
    const entitiesFound: PIIEntity[] = [];
    const policiesApplied: string[] = [];
    const replacements: Array<{ start: number; end: number; replacement: string }> = [];

    for (const match of matches) {
      const policy = this.findPolicy(match.type, context);
      if (policy) {
        let replacement: string;
        switch (policy.action) {
          case 'redact':
            replacement = `[REDACTED:${match.type}]`;
            break;
          case 'hash':
            replacement = this.hashValue(match.value);
            break;
          case 'block':
            replacement = '';
            break;
          case 'mask':
          default:
            replacement = this.maskValue(match.value);
            break;
        }
        replacements.push({ start: match.start, end: match.end, replacement });
        entitiesFound.push({ type: match.type, value: match.value, start: match.start, end: match.end });
        if (!policiesApplied.includes(policy.id)) {
          policiesApplied.push(policy.id);
        }
      }
    }

    let sanitized = text;
    if (replacements.length > 0) {
      replacements.sort((a, b) => a.start - b.start);
      const parts: string[] = [];
      let lastEnd = 0;
      for (const r of replacements) {
        if (r.start > lastEnd) {
          parts.push(sanitized.slice(lastEnd, r.start));
        }
        parts.push(r.replacement);
        lastEnd = r.end;
      }
      if (lastEnd < sanitized.length) {
        parts.push(sanitized.slice(lastEnd));
      }
      sanitized = parts.join('');
    }

    return {
      original: text,
      sanitized,
      entitiesFound,
      entitiesMasked: entitiesFound.length,
      policyApplied: policiesApplied,
    };
  }

  setConfig(config: Partial<PrivacyConfig>): void {
    this.config = { ...this.config, ...config };
  }

  getRetentionManager(): DataRetentionManager {
    return this.retention;
  }

  private findPolicy(piiType: string, context?: string): PrivacyPolicy | undefined {
    return this.config.policies.find(p =>
      p.patterns.some(pt => pt.name === piiType) &&
      (!context || p.appliesTo.some(a => context.includes(a)))
    );
  }

  private maskValue(value: string): string {
    if (value.length <= 4) return this.config.maskingChar.repeat(value.length);
    const visible = value.slice(0, 2) + value.slice(-2);
    return visible[0] + this.config.maskingChar.repeat(value.length - 2) + visible[visible.length - 1];
  }

  private hashValue(value: string): string {
    const hash = createHash('sha256').update(value).digest('hex');
    return `[HASH:${hash.slice(0, 16)}]`;
  }
}
