import { GuardResult } from './pipeline-types';

const BLOCKED_PATTERNS = [
  { pattern: /\b(ignore|desconsidere|disregard|ignore all previous|esqueça|forget everything)\b/i, severity: 'error' as const, message: 'Tentativa de manipulação de contexto' },
  { pattern: /\b(dan|jailbreak|jailbroken|do anything now|liberado|unrestricted)\b/i, severity: 'error' as const, message: 'Padrão de jailbreak detectado' },
  { pattern: /(-----BEGIN .*? PRIVATE KEY-----|sk-[a-zA-Z0-9]{20,}|ghp_[a-zA-Z0-9]{36,})/, severity: 'error' as const, message: 'Chave ou token exposto no prompt' },
  { pattern: /\b(rm\s+-rf\s+[/~]|format\s+[a-z]:|del\s+\/f\s+\/s|:!|shutdown\s+\/s)\b/i, severity: 'error' as const, message: 'Comando destrutivo detectado' },
  { pattern: /\b(como faço para hackear|how to hack|exploit tutorial|invadir|sql injection tutorial)\b/i, severity: 'error' as const, message: 'Conteúdo malicioso bloqueado' },
];

export class PromptGuard {
  guard(prompt: string): GuardResult {
    const issues: Array<{ severity: 'error' | 'warning'; message: string }> = [];
    let sanitized = prompt;

    for (const { pattern, severity, message } of BLOCKED_PATTERNS) {
      if (pattern.test(prompt)) issues.push({ severity, message });
    }

    if (prompt.length > 10000) issues.push({ severity: 'warning', message: 'Prompt muito longo — pode exceder limite de contexto' });
    if (prompt.split('\n').length > 200) issues.push({ severity: 'warning', message: 'Muitas linhas — considere resumir' });

    if (issues.some(i => i.severity === 'error')) sanitized = '[BLOQUEADO POR SEGURANÇA]';

    return { passed: !issues.some(i => i.severity === 'error'), issues, sanitized };
  }
}
