import { Command } from 'commander';
import { ContextRegistry } from '../context/context-registry';
import { resolveActiveContext } from '../context/context-resolver';
import { prioritizeContexts } from '../context/context-prioritizer';
import { mergeContexts } from '../context/context-merge';
import { publishContext } from '../context/context-publisher';
import { buildContextReport } from '../context/context-report';
import { OperationalContext } from '../context/context-types';
import { createEnvelope } from '../hardening/output-contract';
import { printHeader, printLine, printResult } from '../utils/output';
import { getCliVersion } from '../utils/version';

const registry = new ContextRegistry();

function seedContexts(): void {
  registry.createAndRegister({
    name: 'ai-devkit CLI', type: 'product', source: 'CLI', priority: 10,
    tags: ['core', 'cli'], summary: 'Produto principal de linha de comando',
  });
  registry.createAndRegister({
    name: 'VS Code Extension', type: 'extension', source: 'Extension', priority: 8,
    tags: ['ux', 'extension'], summary: 'Extensão para VS Code',
  });
  registry.createAndRegister({
    name: 'Documentação', type: 'governance', status: 'blocked', priority: 7,
    source: 'Docs', tags: ['docs'], dependencies: ['cli'], summary: 'Documentação do projeto',
  });
  registry.createAndRegister({
    name: 'Geração de artefatos', type: 'generation', priority: 6,
    source: 'Generation', tags: ['gen'], dependencies: ['cli', 'docs'], summary: 'Pipeline de geração',
  });
}

export function contextListAction(opts: { json?: boolean; seed?: boolean }): void {
  try {
    if (opts.seed) seedContexts();
    const contexts = registry.list();
    const envelope = createEnvelope({
      ok: true, command: 'context list', version: getCliVersion(),
      data: { count: contexts.length, contexts },
    });
    if (opts.json) { printLine(JSON.stringify(envelope, null, 2)); return; }
    printHeader('Contextos Operacionais');
    printLine(`  Total: ${contexts.length}`);
    for (const ctx of contexts) {
      const icon = ctx.status === 'active' ? '✅' : ctx.status === 'blocked' ? '❌' : ctx.status === 'idle' ? '💤' : '📦';
      printLine(`  ${icon} ${ctx.name} [${ctx.type}] — ${ctx.status} (prioridade: ${ctx.priority})`);
      if (ctx.dependencies.length > 0) printLine(`     Dependências: ${ctx.dependencies.join(', ')}`);
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Erro ao listar contextos: ${message}`);
    process.exit(1);
  }
}

export function contextActiveAction(opts: { json?: boolean; seed?: boolean }): void {
  try {
    if (opts.seed) seedContexts();
    const active = resolveActiveContext(registry.list());
    const envelope = createEnvelope({
      ok: !!active, command: 'context active', version: getCliVersion(),
      data: { active },
    });
    if (opts.json) { printLine(JSON.stringify(envelope, null, 2)); return; }
    if (active) {
      printHeader('Contexto Ativo');
      printLine(`  Nome: ${active.name}`);
      printLine(`  Tipo: ${active.type} | Status: ${active.status} | Prioridade: ${active.priority}`);
      printLine(`  Resumo: ${active.summary}`);
    } else {
      printLine('Nenhum contexto ativo encontrado.');
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Erro ao resolver contexto: ${message}`);
    process.exit(1);
  }
}

export function contextPriorityAction(opts: { json?: boolean; seed?: boolean }): void {
  try {
    if (opts.seed) seedContexts();
    const priorities = prioritizeContexts(registry.list());
    const envelope = createEnvelope({
      ok: true, command: 'context priority', version: getCliVersion(),
      data: { priorities },
    });
    if (opts.json) { printLine(JSON.stringify(envelope, null, 2)); return; }
    printHeader('Prioridade de Contextos');
    for (const p of priorities) {
      const icon = p.score >= 10 ? '🥇' : p.score >= 5 ? '🥈' : '🥉';
      printLine(`  ${icon} ${p.name} — score: ${p.score}`);
      printLine(`     ${p.reason}`);
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Erro ao priorizar contextos: ${message}`);
    process.exit(1);
  }
}

export function contextMergeAction(opts: { json?: boolean; seed?: boolean }): void {
  try {
    if (opts.seed) seedContexts();
    const contexts = registry.list().slice(0, 3);
    const data = contexts.map(c => ({ name: c.name, type: c.type, priority: c.priority, status: c.status }));
    const sourceIds = contexts.map(c => c.contextId);
    const merged = mergeContexts(data, sourceIds);
    const envelope = createEnvelope({
      ok: true, command: 'context merge', version: getCliVersion(),
      data: merged,
    });
    if (opts.json) { printLine(JSON.stringify(envelope, null, 2)); return; }
    printHeader('Merge de Contextos');
    printLine(`  Fontes: ${merged.sources.length}`);
    printLine(`  Campos consolidados: ${Object.keys(merged.fields).length}`);
    for (const [key, field] of Object.entries(merged.fields)) {
      printLine(`  → ${key}: ${JSON.stringify(field.value)} (origem: ${field.sourceContextId.substring(0, 8)}...)`);
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Erro no merge: ${message}`);
    process.exit(1);
  }
}

export function contextReportAction(opts: { json?: boolean; seed?: boolean }): void {
  try {
    if (opts.seed) seedContexts();
    const contexts = registry.list();
    const active = resolveActiveContext(contexts);
    const priorities = prioritizeContexts(contexts);
    const report = buildContextReport({ contexts, activeContext: active, priorities });
    const envelope = createEnvelope({
      ok: true, command: 'context report', version: getCliVersion(),
      data: report,
    });
    if (opts.json) { printLine(JSON.stringify(envelope, null, 2)); return; }
    printHeader('Relatório de Contextos');
    for (const s of report.summary) printLine(`  ℹ ${s}`);
    printLine(`  Total: ${report.totalContexts} | Ativos: ${report.activeCount} | Bloqueados: ${report.blockedCount}`);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Erro no relatório: ${message}`);
    process.exit(1);
  }
}

export function contextShowAction(contextId: string, opts: { json?: boolean }): void {
  try {
    const ctx = registry.get(contextId);
    if (!ctx) { console.error(`Contexto não encontrado: ${contextId}`); process.exit(1); }
    const envelope = createEnvelope({
      ok: true, command: 'context show', version: getCliVersion(), data: ctx,
    });
    if (opts.json) { printLine(JSON.stringify(envelope, null, 2)); return; }
    printHeader(`Contexto: ${ctx.name}`);
    printLine(`  Tipo: ${ctx.type} | Status: ${ctx.status} | Prioridade: ${ctx.priority}`);
    printLine(`  Tags: ${ctx.tags.join(', ')}`);
    printLine(`  Dependências: ${ctx.dependencies.join(', ')}`);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Erro ao exibir: ${message}`);
    process.exit(1);
  }
}

export function contextPromoteAction(contextId: string, opts: { by?: string; json?: boolean }): void {
  try {
    const ctx = registry.get(contextId);
    if (!ctx) { console.error(`Contexto não encontrado: ${contextId}`); process.exit(1); }
    const updated: OperationalContext = { ...ctx, priority: ctx.priority + parseInt(opts.by || '5', 10) };
    registry.register(updated);
    const envelope = createEnvelope({
      ok: true, command: 'context promote', version: getCliVersion(),
      data: { oldPriority: ctx.priority, newPriority: updated.priority },
    });
    if (opts.json) { printLine(JSON.stringify(envelope, null, 2)); return; }
    printResult('Promovido', true, `${ctx.priority} → ${updated.priority}`);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Erro ao promover: ${message}`);
    process.exit(1);
  }
}

export function contextDemoteAction(contextId: string, opts: { by?: string; json?: boolean }): void {
  try {
    const ctx = registry.get(contextId);
    if (!ctx) { console.error(`Contexto não encontrado: ${contextId}`); process.exit(1); }
    const updated: OperationalContext = { ...ctx, priority: Math.max(0, ctx.priority - parseInt(opts.by || '5', 10)) };
    registry.register(updated);
    const envelope = createEnvelope({
      ok: true, command: 'context demote', version: getCliVersion(),
      data: { oldPriority: ctx.priority, newPriority: updated.priority },
    });
    if (opts.json) { printLine(JSON.stringify(envelope, null, 2)); return; }
    printResult('Rebaixado', true, `${ctx.priority} → ${updated.priority}`);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Erro ao rebaixar: ${message}`);
    process.exit(1);
  }
}

export function contextCommand(): Command {
  const cmd = new Command('context')
    .description('Coordenação multicontexto — Fase 12');

  cmd
    .command('list')
    .description('Lista todos os contextos registrados')
    .option('--json', 'Saída em JSON')
    .option('--seed', 'Popula contextos de exemplo')
    .action((opts) => contextListAction(opts));

  cmd
    .command('active')
    .description('Resolve o contexto ativo (maior prioridade não-arquivado)')
    .option('--json', 'Saída em JSON')
    .option('--seed', 'Popula contextos de exemplo')
    .action((opts) => contextActiveAction(opts));

  cmd
    .command('priority')
    .description('Exibe ranking de prioridade dos contextos')
    .option('--json', 'Saída em JSON')
    .option('--seed', 'Popula contextos de exemplo')
    .action((opts) => contextPriorityAction(opts));

  cmd
    .command('merge')
    .description('Consolida múltiplos contextos em um merge rastreável')
    .option('--json', 'Saída em JSON')
    .option('--seed', 'Popula contextos de exemplo')
    .action((opts) => contextMergeAction(opts));

  cmd
    .command('report')
    .description('Relatório completo de contextos')
    .option('--json', 'Saída em JSON')
    .option('--seed', 'Popula contextos de exemplo')
    .action((opts) => contextReportAction(opts));

  // Fase 22 — Federação
  cmd
    .command('show')
    .description('Exibe detalhes de um contexto')
    .argument('<contextId>', 'ID do contexto')
    .option('--json', 'Saída em JSON')
    .action((contextId: string, opts) => contextShowAction(contextId, opts));

  cmd
    .command('promote')
    .description('Aumenta prioridade de um contexto')
    .argument('<contextId>', 'ID do contexto')
    .option('--by <n>', 'Incremento', '5')
    .option('--json', 'Saída em JSON')
    .action((contextId: string, opts) => contextPromoteAction(contextId, opts));

  cmd
    .command('demote')
    .description('Reduz prioridade de um contexto')
    .argument('<contextId>', 'ID do contexto')
    .option('--by <n>', 'Decremento', '5')
    .option('--json', 'Saída em JSON')
    .action((contextId: string, opts) => contextDemoteAction(contextId, opts));

  return cmd;
}
