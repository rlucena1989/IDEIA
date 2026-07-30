import { Command } from 'commander';
import { createLogger } from '@ideia/logger';
import { printHeader, printLine, printResult, finish } from '../utils/output';
import { normalizeInput } from '../cognitive-coprocessor/normalize';
import { computeMetrics } from '../cognitive-coprocessor/metrics';
import { rankPriorities } from '../cognitive-coprocessor/rank';
import { detectInconsistencies } from '../cognitive-coprocessor/inconsistencies';
import { simulateOutcomes } from '../cognitive-coprocessor/simulate';
import { validateAnswer } from '../cognitive-coprocessor/validate';
import { generateReasoningHints } from '../cognitive-coprocessor/hints';
import { prepareContextForLLM } from '../cognitive-coprocessor/context';
import type { PriorityItem, Scenario, Rule, ProblemDescriptor } from '../cognitive-coprocessor/types';

function tryParseJSON(input: string): unknown {
  try { return JSON.parse(input); } catch { return input; }
}

function formatOutput(data: unknown, format: string): string {
  if (format === 'json') return JSON.stringify(data, null, 2);
  if (format === 'markdown') {
    if (typeof data === 'object' && data !== null) {
      const obj = data as Record<string, unknown>;
      const lines: string[] = [];
      for (const [key, val] of Object.entries(obj)) {
        if (typeof val === 'object') {
          lines.push(`### ${key}\n\`\`\`json\n${JSON.stringify(val, null, 2)}\n\`\`\``);
        } else {
          lines.push(`- **${key}**: ${val}`);
        }
      }
      return lines.join('\n');
    }
    return String(data);
  }
  return JSON.stringify(data, null, 2);
}

/**
 * Processa command.
 * @returns O resultado da operação.
 */
export function coprocessCommand(): Command {
  const cmd = new Command('coprocess')
    .description('Processamento coparticipativo de IA — cálculo, validação e contexto cognitivo')
    .option('--json', 'Saída em JSON')
    .option('--markdown', 'Saída em Markdown')
    .option('--llm-ready', 'Formato otimizado para LLM (Markdown)');

  cmd.command('run <input>')
    .description('Executa pipeline cognitivo completo')
    .action((input: string, opts: Record<string, unknown>) => {
      printHeader('Cognitive Coprocessor — Pipeline Completo');
      const data = tryParseJSON(input);
      const format = (opts as Record<string, string>).json ? 'json' : (opts as Record<string, string>).llmReady ? 'llm-ready' : 'markdown';
      const result = prepareContextForLLM(data, { format: format === 'llm-ready' ? 'markdown' : format as 'json' | 'markdown' });
      printLine(format === 'llm-ready' ? result.formatted : formatOutput(result.context, format));
      finish({ checkpoint: 'coprocess-context', ok: true, status: 'completed', context_summary: 'Contexto preparado para LLM' });
    });

  cmd.command('normalize <input>')
    .description('COP-01: Normaliza e valida entrada para consumo da IA')
    .action((input: string, opts: Record<string, unknown>) => {
      printHeader('COP-01 — normalizeInput');
      const data = tryParseJSON(input);
      const result = normalizeInput(data);
      const format = (opts as Record<string, string>).json ? 'json' : 'markdown';
      printLine(formatOutput(result, format));
      if (result.anomalies.length > 0) {
        printLine(`\n⚠️  ${result.anomalies.length} anomalia(s) detectada(s)`);
      }
      finish({ checkpoint: 'coprocess-normalize', ok: true, status: 'completed', context_summary: 'Entrada normalizada' });
    });

  cmd.command('metrics <input>')
    .description('COP-02: Computa métricas multidimensionais para raciocínio da IA')
    .action((input: string, opts: Record<string, unknown>) => {
      printHeader('COP-02 — computeMetrics');
      const data = tryParseJSON(input);
      const result = computeMetrics(data, { percentiles: true, trend: true });
      const format = (opts as Record<string, string>).json ? 'json' : 'markdown';
      printLine(formatOutput(result, format));
      finish({ checkpoint: 'coprocess-metrics', ok: true, status: 'completed', context_summary: 'Métricas computadas' });
    });

  cmd.command('rank <json>')
    .description('COP-03: Ranqueia itens por critérios combinados (urgência, impacto, risco)')
    .action((json: string, opts: Record<string, unknown>) => {
      printHeader('COP-03 — rankPriorities');
      const items = JSON.parse(json) as PriorityItem[];
      const result = rankPriorities(items);
      const format = (opts as Record<string, string>).json ? 'json' : 'markdown';
      printLine(formatOutput(result, format));
      finish({ checkpoint: 'coprocess-rank', ok: true, status: 'completed', context_summary: 'Itens ranqueados' });
    });

  cmd.command('detect <json>')
    .description('COP-04: Detecta inconsistências lógicas, numéricas e de regras')
    .option('--rules <json>', 'Regras de policy em JSON')
    .action((json: string, opts: Record<string, unknown>) => {
      printHeader('COP-04 — detectInconsistencies');
      const data = JSON.parse(json);
      const rulesStr = (opts as Record<string, string>).rules;
      const rules: Rule[] | undefined = rulesStr ? JSON.parse(rulesStr) : undefined;
      const result = detectInconsistencies(data, rules);
      const format = (opts as Record<string, string>).json ? 'json' : 'markdown';
      printLine(formatOutput(result, format));
      finish({ checkpoint: 'coprocess-detect', ok: true, status: 'completed', context_summary: 'Inconsistências detectadas' });
    });

  cmd.command('simulate <json>')
    .description('COP-05: Simula cenários what-if (determinístico, heurístico, monte-carlo)')
    .option('--mode <mode>', 'Modo: deterministic | heuristic | monte-carlo')
    .option('--iterations <n>', 'Iterações para monte-carlo', '100')
    .action((json: string, opts: Record<string, unknown>) => {
      printHeader('COP-05 — simulateOutcomes');
      const scenario = JSON.parse(json) as Scenario;
      const mode = ((opts as Record<string, string>).mode || 'deterministic') as 'deterministic' | 'heuristic' | 'monte-carlo';
      const iterations = parseInt((opts as Record<string, string>).iterations || '100', 10);
      const result = simulateOutcomes(scenario, { mode, iterations });
      const format = (opts as Record<string, string>).json ? 'json' : 'markdown';
      printLine(formatOutput(result, format));
      finish({ checkpoint: 'coprocess-simulate', ok: true, status: 'completed', context_summary: 'Simulação concluída' });
    });

  cmd.command('validate <json>')
    .description('COP-06: Valida resposta da IA contra verdade conhecida e regras')
    .option('--ground-truth <json>', 'Valor esperado para validação numérica')
    .option('--rules <json>', 'Regras de policy em JSON')
    .action((json: string, opts: Record<string, unknown>) => {
      printHeader('COP-06 — validateAnswer');
      const answer = JSON.parse(json);
      const groundTruthStr = (opts as Record<string, string>).groundTruth;
      const groundTruth = groundTruthStr ? JSON.parse(groundTruthStr) : undefined;
      const rulesStr = (opts as Record<string, string>).rules;
      const rules: Rule[] | undefined = rulesStr ? JSON.parse(rulesStr) : undefined;
      const result = validateAnswer(answer, groundTruth, rules);
      const format = (opts as Record<string, string>).json ? 'json' : 'markdown';
      printLine(formatOutput(result, format));
      finish({ checkpoint: 'coprocess-validate', ok: true, status: 'completed', context_summary: 'Resposta validada' });
    });

  cmd.command('hints <input>')
    .description('COP-07: Gera dicas de raciocínio para guiar a IA')
    .action((input: string, opts: Record<string, unknown>) => {
      printHeader('COP-07 — generateReasoningHints');
      const problem: ProblemDescriptor = {
        type: /\d+[+\-*/]/.test(input) ? 'numerical' : /\b(compare|versus|diff|gap)\b/i.test(input) ? 'mixed' : 'textual',
        input,
      };
      const result = generateReasoningHints(problem);
      const format = (opts as Record<string, string>).json ? 'json' : 'markdown';
      printLine(formatOutput(result, format));
      finish({ checkpoint: 'coprocess-hints', ok: true, status: 'completed', context_summary: 'Dicas de raciocínio geradas' });
    });

  cmd.command('context <input>')
    .description('COP-08: Monta pacote de contexto cognitivo completo para LLM')
    .action((input: string, opts: Record<string, unknown>) => {
      printHeader('COP-08 — prepareContextForLLM');
      const data = tryParseJSON(input);
      const format = (opts as Record<string, string>).json ? 'json' : (opts as Record<string, string>).llmReady ? 'llm-ready' : 'markdown';
      const result = prepareContextForLLM(data, { format: format === 'llm-ready' ? 'markdown' : format as 'json' | 'markdown' });
      if (format === 'llm-ready') {
        printLine(result.formatted);
      } else {
        printLine(formatOutput(result.context, format));
      }
      finish({ checkpoint: 'coprocess-context', ok: true, status: 'completed', context_summary: 'Contexto LLM preparado' });
    });

  return cmd;
}
