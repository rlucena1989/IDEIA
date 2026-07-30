import { Command } from 'commander';
import { createLogger } from '@ideia/logger';
import { MemoryStore, createMemoryRecord } from '@ideia/memory-store';
import { detectPatterns } from '../memory/pattern-detector';
import { generateRecommendations } from '../memory/learning-engine';
import { adaptPolicy } from '../memory/policy-adapter';
import { createEnvelope } from '../hardening/output-contract';
import { printHeader, printLine, printResult } from '../utils/output';
import { getCliVersion } from '../utils/version';

const store = new MemoryStore();

function seedMemory(): void {
  store.append(createMemoryRecord({ category: 'failure', source: 'harden', summary: 'Consistency check failed', tags: ['consistency', 'warning'], severity: 'high' }));
  store.append(createMemoryRecord({ category: 'failure', source: 'harden', summary: 'Consistency check failed again', tags: ['consistency', 'warning'], severity: 'high' }));
  store.append(createMemoryRecord({ category: 'cycle', source: 'autonomous', summary: 'Cycle completed with drift', tags: ['drift', 'cycle'], severity: 'medium' }));
  store.append(createMemoryRecord({ category: 'recovery', source: 'resilience', summary: 'Auto-repair executed', tags: ['repair', 'success'], severity: 'low' }));
}

export function learnAnalyzeAction(opts: { seed?: boolean; json?: boolean }): void {
  try {
    if (opts.seed) seedMemory();
    const patterns = detectPatterns(store.list());
    const envelope = createEnvelope({ ok: true, command: 'learn analyze', version: getCliVersion(), data: { patterns } });
    if (opts.json) { printLine(JSON.stringify(envelope, null, 2)); return; }
    printHeader('Análise de Padrões');
    for (const p of patterns) {
      printLine(`  🔄 ${p.name}: frequência ${p.frequency}, confiança ${(p.confidence * 100).toFixed(0)}%`);
    }
    if (patterns.length === 0) printLine('  Nenhum padrão recorrente detectado.');
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Erro na análise: ${message}`);
    process.exit(1);
  }
}

export function learnRecommendAction(opts: { seed?: boolean; json?: boolean }): void {
  try {
    if (opts.seed) seedMemory();
    const patterns = detectPatterns(store.list());
    const recommendations = generateRecommendations(patterns);
    const envelope = createEnvelope({ ok: true, command: 'learn recommend', version: getCliVersion(), data: { recommendations } });
    if (opts.json) { printLine(JSON.stringify(envelope, null, 2)); return; }
    printHeader('Recomendações');
    for (const r of recommendations) {
      printLine(`  💡 ${r.action} → ${r.target} (${(r.confidence * 100).toFixed(0)}%)`);
      printLine(`     ${r.rationale}`);
    }
    if (recommendations.length === 0) printLine('  Nenhuma recomendação no momento.');
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Erro nas recomendações: ${message}`);
    process.exit(1);
  }
}

export function learnApplyAction(policyName: string, change: string, opts: { confidence?: string; json?: boolean }): void {
  try {
    const confidence = parseFloat(opts.confidence || '0.85');
    const adjustment = adaptPolicy(policyName, change, confidence);
    const envelope = createEnvelope({ ok: adjustment.approved, command: 'learn apply', version: getCliVersion(), data: adjustment });
    if (opts.json) { printLine(JSON.stringify(envelope, null, 2)); return; }
    printHeader('Ajuste de Política');
    printResult('Aprovado', adjustment.approved, adjustment.reason);
    printLine(`  Política: ${adjustment.policyName}`);
    printLine(`  Mudança: ${adjustment.change}`);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Erro no ajuste: ${message}`);
    process.exit(1);
  }
}

export function learnCommand(): Command {
  const cmd = new Command('learn')
    .description('Aprendizado adaptativo por memória — Fase 26');

  cmd
    .command('analyze')
    .description('Analisa memória e detecta padrões')
    .option('--seed', 'Popula registros de exemplo')
    .option('--json', 'Saída em JSON')
    .action((opts) => learnAnalyzeAction(opts));

  cmd
    .command('recommend')
    .description('Gera recomendações baseadas em padrões')
    .option('--seed', 'Popula registros de exemplo')
    .option('--json', 'Saída em JSON')
    .action((opts) => learnRecommendAction(opts));

  cmd
    .command('apply')
    .description('Aplica ajuste de política baseado em aprendizado')
    .argument('<policy-name>', 'Nome da política')
    .argument('<change>', 'Descrição da mudança')
    .option('--confidence <n>', 'Confiança', '0.85')
    .option('--json', 'Saída em JSON')
    .action((policyName: string, change: string, opts) => learnApplyAction(policyName, change, opts));

  return cmd;
}
