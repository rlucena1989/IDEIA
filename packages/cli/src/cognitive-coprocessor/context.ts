import type { CognitiveContext, ContextOptions, CoprocessOptions } from './types';
import { normalizeInput } from './normalize';
import { computeMetrics } from './metrics';
import { rankPriorities } from './rank';
import { detectInconsistencies } from './inconsistencies';
import { simulateOutcomes } from './simulate';
import { validateAnswer } from './validate';
import { generateReasoningHints } from './hints';

function toMarkdown(ctx: CognitiveContext): string {
  const sections: string[] = ['## Contexto Cognitivo — AI-Devkit Coprocessor\n'];

  if (ctx.normalizedInput) {
    sections.push('### Entrada Normalizada');
    sections.push(`- Tipo: ${ctx.normalizedInput.metadata.inputType}`);
    sections.push(`- Registros: ${ctx.normalizedInput.metadata.recordCount}`);
    sections.push(`- Schema válido: ${ctx.normalizedInput.metadata.schemaValid}`);
    if (ctx.normalizedInput.anomalies.length > 0) {
      sections.push(`- Anomalias: ${ctx.normalizedInput.anomalies.length} encontradas`);
      for (const a of ctx.normalizedInput.anomalies) {
        sections.push(`  - [${a.severity}] ${a.message}`);
      }
    }
    if (ctx.normalizedInput.features.length > 0) {
      sections.push('- Features extraídas:');
      for (const f of ctx.normalizedInput.features.slice(0, 10)) {
        sections.push(`  - ${f.name}: ${f.value}`);
      }
    }
  }

  if (ctx.metrics && ctx.metrics.metrics.length > 0) {
    sections.push('\n### Métricas');
    sections.push('| Métrica | Valor | Interpretação |');
    sections.push('|---------|-------|---------------|');
    for (const m of ctx.metrics.metrics) {
      sections.push(`| ${m.label} | ${m.value} | ${m.interpretation} |`);
    }
    sections.push(`\nResumo: ${ctx.metrics.summary}`);
  }

  if (ctx.inconsistencies && ctx.inconsistencies.inconsistencies.length > 0) {
    sections.push('\n### Inconsistências Detectadas');
    sections.push(`Severidade geral: ${ctx.inconsistencies.severity}`);
    for (const inc of ctx.inconsistencies.inconsistencies) {
      sections.push(`- [${inc.severity}] ${inc.message} (confiança: ${Math.round(inc.confidence * 100)}%)`);
    }
  }

  if (ctx.priorities && ctx.priorities.ranked.length > 0) {
    sections.push('\n### Prioridades Ranqueadas');
    sections.push('| # | Item | Score | Urgência | Impacto | Risco |');
    sections.push('|---|------|-------|----------|---------|-------|');
    for (let i = 0; i < ctx.priorities.ranked.length; i++) {
      const item = ctx.priorities.ranked[i];
      sections.push(`| ${i + 1} | ${item.label} | ${item.score} | ${item.urgency} | ${item.impact} | ${item.risk} |`);
    }
    sections.push(`\nRaciocínio: ${ctx.priorities.reasoning}`);
  }

  if (ctx.simulations && ctx.simulations.outcomes.length > 0) {
    sections.push('\n### Simulações');
    for (const o of ctx.simulations.outcomes.slice(0, 5)) {
      sections.push(`- ${o.scenario}: resultado ${o.result} (probabilidade ${Math.round(o.probability * 100)}%)`);
    }
    sections.push(`Confiança: ${Math.round(ctx.simulations.confidence * 100)}%`);
    for (const r of ctx.simulations.recommendations) {
      sections.push(`- Recomendação: ${r}`);
    }
  }

  if (ctx.hints && ctx.hints.hints.length > 0) {
    sections.push('\n### Dicas de Raciocínio');
    for (const h of ctx.hints.hints) {
      sections.push(`- [${h.type}] ${h.message}`);
    }
    if (ctx.hints.deterministicPaths.length > 0) {
      sections.push('\nCaminhos determinísticos disponíveis:');
      for (const p of ctx.hints.deterministicPaths) {
        sections.push(`- \`${p}\``);
      }
    }
  }

  return sections.join('\n');
}

/**
 * Prepara context for l l m.
 * @param input - Valor input.
 * @param options - Valor options.
 * @returns O resultado da operação.
 */
export function prepareContextForLLM(input: unknown, options?: ContextOptions): { context: CognitiveContext; formatted: string } {
  const ctx: CognitiveContext = {
    normalizedInput: null,
    metrics: null,
    inconsistencies: null,
    priorities: null,
    simulations: null,
    hints: null,
    validationRules: [],
  };

  const normalized = normalizeInput(input);
  ctx.normalizedInput = normalized;

  const metrics = computeMetrics(input);
  ctx.metrics = metrics;

  const inconsistencies = detectInconsistencies(input);
  ctx.inconsistencies = inconsistencies;

  if (Array.isArray(input) && input.length > 0 && typeof input[0] === 'object') {
    const items = input as Array<{ id: string; label: string; urgency?: number; impact?: number; risk?: number }>;
    const rankItems = items.map(item => ({
      id: item.id || String(Math.random()),
      label: item.label || 'unknown',
      urgency: item.urgency ?? 5,
      impact: item.impact ?? 5,
      risk: item.risk ?? 5,
    }));
    ctx.priorities = rankPriorities(rankItems);
  }

  if (typeof input === 'object' && input !== null && 'scenario' in (input as Record<string, unknown>)) {
    const scenario = (input as Record<string, unknown>).scenario;
    if (scenario && typeof scenario === 'object') {
      ctx.simulations = simulateOutcomes(scenario as Parameters<typeof simulateOutcomes>[0]);
    }
  }

  const problemDesc = {
    type: (typeof input === 'number' || (Array.isArray(input) && input.every(v => typeof v === 'number'))) ? 'numerical' as const
      : typeof input === 'string' ? 'textual' as const : 'mixed' as const,
    input: typeof input === 'string' ? input : JSON.stringify(input).slice(0, 500),
  };
  ctx.hints = generateReasoningHints(problemDesc);

  const format = options?.format || 'markdown';
  const formatted = format === 'json' ? JSON.stringify(ctx, null, 2) : toMarkdown(ctx);

  return { context: ctx, formatted };
}
