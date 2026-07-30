export interface PIIPattern {
  name: string;
  regex: RegExp;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: string;
}

export interface PIIMatch {
  type: string;
  value: string;
  start: number;
  end: number;
}

export const DEFAULT_PII_PATTERNS: PIIPattern[] = [
  { name: 'email', regex: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, severity: 'medium', category: 'contact' },
  { name: 'phone', regex: /(?:\+?\d{1,3}[-.\s]?)?\(?\d{2,3}\)?[-.\s]?\d{4,5}[-.\s]?\d{4}/g, severity: 'medium', category: 'contact' },
  { name: 'cpf', regex: /\d{3}\.\d{3}\.\d{3}-\d{2}/g, severity: 'critical', category: 'governmental' },
  { name: 'cnpj', regex: /\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}/g, severity: 'critical', category: 'governmental' },
  { name: 'credit_card', regex: /(?:\d{4}[-\s]?){3}\d{4}/g, severity: 'critical', category: 'financial' },
  { name: 'ip_address', regex: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g, severity: 'low', category: 'network' },
  { name: 'cep', regex: /\d{5}-?\d{3}/g, severity: 'medium', category: 'address' },
  { name: 'api_key', regex: /(?:api[_-]?key|apikey|secret[_-]?key)['"]?\s*[:=]\s*['"]?[\w-]{16,}/gi, severity: 'critical', category: 'credential' },
  { name: 'jwt', regex: /eyJ[a-zA-Z0-9_-]+\.eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/g, severity: 'critical', category: 'credential' },
  { name: 'password', regex: /(?:password|passwd|pwd)['"]?\s*[:=]\s*['"]?.{6,}['"]?/gi, severity: 'critical', category: 'credential' },
  { name: 'ssn', regex: /\b\d{3}-\d{2}-\d{4}\b/g, severity: 'critical', category: 'governmental' },
  { name: 'token', regex: /(?:token|bearer)['"]?\s*[:=]\s*['"]?[a-zA-Z0-9_-]{20,}/gi, severity: 'critical', category: 'credential' },

  // === International phone formats ===
  { name: 'uk_phone', regex: /(?:\+44\s?7\d{3}|07\d{3})\s?\d{6}\b/g, severity: 'medium', category: 'contact' },
  { name: 'fr_phone', regex: /(?:\+33|0)\s?[1-9](?:\s?\d{2}){4}\b/g, severity: 'medium', category: 'contact' },
  { name: 'de_phone', regex: /(?:\+49|0)\s?[1-9]\d{1,3}\s?\d{4,8}\b/g, severity: 'medium', category: 'contact' },
  { name: 'br_phone', regex: /\b(?:\+55\s?)?\(?\d{2}\)?\s?\d{4,5}-?\d{4}\b/g, severity: 'medium', category: 'contact' },
  { name: 'jp_phone', regex: /(?:\+81\s?[1-9]\d{0,2}|0\d{1,3})\s?\d{4}\s?\d{4}\b/g, severity: 'medium', category: 'contact' },
  { name: 'in_phone', regex: /\b(?:\+91\s?)?[6789]\d{9}\b/g, severity: 'medium', category: 'contact' },

  // === International ID formats ===
  { name: 'uk_ni_number', regex: /\b(?:[A-CEGHJ-PR-TW-Z][A-CEGHJ-NPR-TW-Z]\s?\d{2}\s?\d{2}\s?\d{2}\s?[A-D])\b/g, severity: 'high', category: 'governmental' },
  { name: 'in_aadhaar', regex: /\b[2-9]\d{3}\s?\d{4}\s?\d{4}\b/g, severity: 'critical', category: 'governmental' },
  { name: 'cn_id', regex: /\b[1-9]\d{5}(?:19|20)\d{2}(?:0[1-9]|1[0-2])(?:0[1-9]|[12]\d|3[01])\d{3}[\dXx]\b/g, severity: 'critical', category: 'governmental' },

  // === Passport numbers ===
  { name: 'passport_uk', regex: /\b\d{9}\b(?=(?:\s|$|\.|,))/g, severity: 'high', category: 'governmental' },
  { name: 'passport_us', regex: /\b(?:[A-Z]\d{8}|\d{9})\b/g, severity: 'high', category: 'governmental' },

  // === Financial international ===
  { name: 'iban', regex: /\b[A-Z]{2}\d{2}\s?(?:[A-Z0-9]{4}\s?){2,7}[A-Z0-9]{1,4}\b/g, severity: 'high', category: 'financial' },
  { name: 'swift_bic', regex: /\b[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}(?:[A-Z0-9]{3})?\b/g, severity: 'high', category: 'financial' },

  // === Tax IDs ===
  { name: 'eu_vat', regex: /\b(?:AT|BE|BG|CY|CZ|DE|DK|EE|EL|ES|FI|FR|HR|HU|IE|IT|LT|LU|LV|MT|NL|PL|PT|RO|SE|SI|SK)[A-Z0-9]{2,12}\b/g, severity: 'high', category: 'financial' },
  { name: 'in_gst', regex: /\b\d{2}[A-Z]{5}\d{4}[A-Z]{1}[A-Z\d]{1}[Z]{1}[A-Z\d]{1}\b/g, severity: 'high', category: 'financial' },

  // === Canadian identifiers ===
  { name: 'ca_sin', regex: /\b\d{3}[-\s]?\d{3}[-\s]?\d{3}\b(?![-\s]?\d{2})/g, severity: 'critical', category: 'governmental' },

  // === Australian identifiers ===
  { name: 'au_tfn', regex: /\b\d{8,9}\b(?!\d)/g, severity: 'high', category: 'governmental' },

  // === Japanese identifiers ===
  { name: 'jp_my_number', regex: /\b\d{4}\s?\d{4}\s?\d{4}\b(?!\d)/g, severity: 'critical', category: 'governmental' },

  // === German identifiers ===
  { name: 'de_ssn', regex: /\b\d{2}\s?\d{2}\s?\d{2}\s?\d{2}\s?\d{2}\s?[A-Z]\d{2}\b/g, severity: 'high', category: 'governmental' },

  // === Driver's license numbers ===
  { name: 'dl_us', regex: /\b[A-Z]\d{6,9}\b/g, severity: 'medium', category: 'governmental' },
  { name: 'dl_uk', regex: /\b[A-Z]{5}\d{6}[A-Z0-9]{5}\b/g, severity: 'medium', category: 'governmental' },
  { name: 'dl_ca', regex: /\b[A-Z]{1,2}\d{5,7}\b/g, severity: 'medium', category: 'governmental' },
];

export class PIIDetector {
  private patterns: PIIPattern[];

  constructor(patterns?: PIIPattern[]) {
    this.patterns = patterns ?? DEFAULT_PII_PATTERNS;
  }

  detect(text: string): PIIMatch[] {
    const matches: PIIMatch[] = [];
    for (const pattern of this.patterns) {
      const regex = new RegExp(pattern.regex.source, 'g');
      let match: RegExpExecArray | null;
      while ((match = regex.exec(text)) !== null) {
        matches.push({
          type: pattern.name,
          value: match[0],
          start: match.index,
          end: match.index + match[0].length,
        });
      }
    }
    return matches.sort((a, b) => a.start - b.start);
  }

  addPattern(pattern: PIIPattern): void {
    this.patterns.push(pattern);
  }

  getPatterns(): PIIPattern[] {
    return [...this.patterns];
  }
}
