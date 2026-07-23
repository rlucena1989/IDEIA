/** Interface que define a estrutura de memory metric. */
export interface MemoryMetric {
  name: string;
  category: 'heap' | 'stack' | 'event_loop' | 'gc' | 'closure' | 'leak';
  value: number;
  threshold: number;
  status: 'ok' | 'warning' | 'critical';
  suggestion: string;
}

/** Interface que define a estrutura de memory analysis report. */
export interface MemoryAnalysisReport {
  metrics: MemoryMetric[];
  total: number;
  warnings: number;
  criticals: number;
  leakSignals: string[];
  score: number;
  summary: string;
}

const MEMORY_RULES = [
  { name: 'global_vars', pattern: /^var\s+\w+\s*=\s*(?!require|import)/gm, category: 'heap' as const, threshold: 5, suggestion: 'Use const/let em escopo local para evitar poluicao global' },
  { name: 'closure_vars', pattern: /function\s*\w*\s*\([^)]*\)\s*\{[\s\S]*?function\s*\w*\s*\([^)]*\)\s*\{[\s\S]*?\}\s*\}/g, category: 'closure' as const, threshold: 3, suggestion: 'Closures aninhadas retem escopo. Considere refatorar.' },
  { name: 'large_arrays', pattern: /new\s+Array\(\d{4,}\)/g, category: 'heap' as const, threshold: 1, suggestion: 'Arrays muito grandes em memoria. Considere streaming ou paginacao.' },
  { name: 'string_concat_loop', pattern: /for\s*\([^)]*\)\s*\{[\s\S]*?(?:\+=|\+[\s\S]*?['"`])/g, category: 'heap' as const, threshold: 2, suggestion: 'Concatenacao de strings em loop. Use array.join("") ou template builder.' },
  { name: 'setInterval_no_clear', pattern: /setInterval\s*\(/g, category: 'event_loop' as const, threshold: 2, suggestion: 'Verifique se intervalos sao limpos com clearInterval()' },
  { name: 'event_listener_no_remove', pattern: /addEventListener\s*\(/g, category: 'event_loop' as const, threshold: 5, suggestion: 'Verifique se listeners sao removidos em cleanup' },
  { name: 'recursion', pattern: /function\s+(\w+)\s*\([^)]*\)\s*\{[\s\S]*?\1\s*\(/g, category: 'stack' as const, threshold: 1, suggestion: 'Recursao sem caso base claro. Risco de stack overflow.' },
  { name: 'eval_usage', pattern: /\beval\s*\(/g, category: 'heap' as const, threshold: 0, suggestion: 'eval() impede otimizacoes do GC. Evite seu uso.' },
];

/**
 * Processa memory.
 * @param code - Valor code.
 * @returns O resultado da operação.
 */
export function analyzeMemory(code: string): MemoryAnalysisReport {
  const metrics: MemoryMetric[] = [];
  const leakSignals: string[] = [];

  for (const rule of MEMORY_RULES) {
    const matches = code.match(rule.pattern);
    const count = matches ? matches.length : 0;
    const value = count;

    let status: 'ok' | 'warning' | 'critical' = 'ok';
    if (value > rule.threshold * 2) status = 'critical';
    else if (value > rule.threshold) status = 'warning';

    metrics.push({ name: rule.name, category: rule.category, value, threshold: rule.threshold, status, suggestion: rule.suggestion });

    if (status === 'critical' || (rule.threshold === 0 && value > 0)) {
      leakSignals.push(`${rule.name}: ${value} ocorrencia(s) — ${rule.suggestion}`);
    }
  }

  const warnings = metrics.filter(m => m.status === 'warning').length;
  const criticals = metrics.filter(m => m.status === 'critical').length;
  const penalty = warnings * 10 + criticals * 25;
  const score = Math.max(0, 100 - penalty);

  const summary = criticals > 0
    ? `Memoria: Score ${score}/100 — ${criticals} criticos, ${warnings} avisos. Possiveis leaks detectados.`
    : warnings > 0
      ? `Memoria: Score ${score}/100 — ${warnings} avisos. Sem leaks criticos detectados.`
      : `Memoria: Score ${score}/100 — OK. Nenhum problema de memoria detectado.`;

  return { metrics, total: metrics.length, warnings, criticals, leakSignals, score, summary };
}