import { GuardrailsResult } from './types';

interface GuardrailRule {
  id: string;
  description: string;
  check: (input: string) => string | null;
}

const RULES: GuardrailRule[] = [
  { id: 'no-secrets', description: 'detect potential secrets in input', check: (s) => /(?:sk-[a-zA-Z0-9]{20,}|ghp_[a-zA-Z0-9]{36,}|-----BEGIN (?:RSA |EC )?PRIVATE KEY-----)/.test(s) ? 'input contains potential secret key' : null },
  { id: 'no-code-injection', description: 'detect code injection attempts', check: (s) => /process\.env|require\(|import\s+|exec\(|eval\(/.test(s) && /\b(?:process|require|import|exec|eval)\b/.test(s) ? 'input contains code injection patterns' : null },
  { id: 'no-sql-injection', description: 'detect SQL injection patterns', check: (s) => /(?:DROP\s+TABLE|DELETE\s+FROM|OR\s+1=1|UNION\s+SELECT)/i.test(s) ? 'input contains SQL injection patterns' : null },
  { id: 'max-length', description: 'input max 10000 chars', check: (s) => s.length > 10000 ? `input exceeds 10000 chars (${s.length})` : null },
  { id: 'no-binary', description: 'reject binary content', check: (s) => { for (let i = 0; i < s.length; i++) { const c = s.charCodeAt(i); if (c <= 0x08 || (c >= 0x0E && c <= 0x1F)) return 'input contains binary characters'; } return null; } },
];

export function validateInput(input: string): GuardrailsResult {
  const violations: string[] = [];
  const suggestions: string[] = [];

  for (const rule of RULES) {
    const result = rule.check(input);
    if (result) violations.push(result);
  }

  if (violations.length > 0) suggestions.push('sanitize input before sending to external provider');

  return { approved: violations.length === 0, violations, suggestions };
}

export function validateOutput(output: string): GuardrailsResult {
  const violations: string[] = [];
  const suggestions: string[] = [];

  if (output.length > 50000) { violations.push('output exceeds 50000 chars'); suggestions.push('truncate output'); }

  return { approved: violations.length === 0, violations, suggestions };
}
