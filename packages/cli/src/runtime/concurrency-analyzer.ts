/** Interface que define a estrutura de concurrency finding. */
export interface ConcurrencyFinding {
  name: string;
  category: 'async' | 'promise' | 'callback' | 'race_condition' | 'blocking' | 'thread';
  severity: 'info' | 'warning' | 'error';
  pattern: string;
  line: number;
  suggestion: string;
}

/** Interface que define a estrutura de concurrency report. */
export interface ConcurrencyReport {
  findings: ConcurrencyFinding[];
  total: number;
  errors: number;
  warnings: number;
  asyncRatio: number;
  blockingCalls: string[];
  score: number;
  summary: string;
}

const BLOCKING_PATTERNS = [
  { name: 'sync_fs', pattern: /fs\.(readFileSync|writeFileSync|existsSync|mkdirSync|rmSync|copyFileSync|renameSync)/g, severity: 'warning' as const, suggestion: 'Use versao async (fs.promises) para nao bloquear event loop' },
  { name: 'sync_http', pattern: /(https?|http)\.(get|request)Sync/g, severity: 'error' as const, suggestion: 'Chamadas HTTP sincronas bloqueiam todo o processo' },
  { name: 'exec_sync', pattern: /(child_process|cp)\.(execSync|spawnSync)/g, severity: 'warning' as const, suggestion: 'Use exec/spawn assincronos para comandos externos' },
  { name: 'sleep_blocking', pattern: /Atomics\.wait\s*\(/g, severity: 'error' as const, suggestion: 'Atomics.wait bloqueia a thread. Use setTimeout ou alarme.' },
];

const ASYNC_PATTERNS = [
  { name: 'callback_hell', pattern: /(?:[})];?\s*){3,}/g, severity: 'warning' as const, suggestion: 'Callback hell detectado. Use async/await ou Promise chain.' },
  { name: 'unhandled_promise', pattern: /\.then\s*\([^)]*\)\s*;$/gm, severity: 'warning' as const, suggestion: 'Promise sem catch. Adicione .catch() para tratar erros.' },
  { name: 'promise_all_needed', pattern: /await\s+\w+\s*\(\s*\)[\s\S]*?await\s+\w+\s*\(\s*\)/g, severity: 'info' as const, suggestion: 'Awaits sequenciais — use Promise.all() para paralelizar.' },
];

/**
 * Processa concurrency.
 * @param code - Valor code.
 * @returns O resultado da operação.
 */
export function analyzeConcurrency(code: string): ConcurrencyReport {
  const findings: ConcurrencyFinding[] = [];
  const blockingCalls: string[] = [];
  const lines = code.split('\n');

  for (const rule of BLOCKING_PATTERNS) {
    let match: RegExpExecArray | null;
    const re = new RegExp(rule.pattern.source, 'g');
    while ((match = re.exec(code)) !== null) {
      const line = code.substring(0, match.index).split('\n').length;
      findings.push({ name: rule.name, category: 'blocking', severity: rule.severity, pattern: match[0], line, suggestion: rule.suggestion });
      blockingCalls.push(`${rule.name}:${line}`);
    }
  }

  for (const rule of ASYNC_PATTERNS) {
    let match: RegExpExecArray | null;
    const re = new RegExp(rule.pattern.source, 'g');
    while ((match = re.exec(code)) !== null) {
      const line = code.substring(0, match.index).split('\n').length;
      findings.push({ name: rule.name, category: rule.severity === 'info' ? 'async' : 'promise', severity: rule.severity, pattern: match[0]!.substring(0, 50), line, suggestion: rule.suggestion });
    }
  }

  const asyncCount = (code.match(/\basync\b/g) || []).length;
  const awaitCount = (code.match(/\bawait\b/g) || []).length;
  const promiseCount = (code.match(/\.then\s*\(/g) || []).length;
  const totalAsync = asyncCount + awaitCount + promiseCount;
  const totalCode = lines.length;
  const asyncRatio = totalCode > 0 ? Math.round((totalAsync / totalCode) * 100) : 0;

  const errors = findings.filter(f => f.severity === 'error').length;
  const warnings = findings.filter(f => f.severity === 'warning').length;
  const score = Math.max(0, 100 - (errors * 20 + warnings * 8 + blockingCalls.length * 5));

  const severityLabel = score >= 90 ? 'Excelente' : score >= 70 ? 'Bom' : score >= 50 ? 'Regular' : 'Ruim';
  const summary = `Concorrencia: Score ${score}/100 (${severityLabel}). ${errors} erros, ${warnings} avisos. Async ratio: ${asyncRatio}%.${blockingCalls.length > 0 ? ` ${blockingCalls.length} chamadas bloqueantes.` : ''}`;

  return { findings, total: findings.length, errors, warnings, asyncRatio, blockingCalls, score, summary };
}