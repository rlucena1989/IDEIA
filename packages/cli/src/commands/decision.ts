import { Command } from 'commander';
import { createLogger } from '@ideia/logger';
import { ExplanationRegistry } from '../explanation/explanation-registry';
import { createDecisionTrace } from '../explanation/decision-trace';
import { explainDecision } from '../explanation/explanation-engine';
import { buildRationale } from '../explanation/rationale-builder';
import { linkEvidence } from '../explanation/evidence-linker';
import { buildExplainReport } from '../explanation/explain-report';
import { createEnvelope } from '../hardening/output-contract';
import { printHeader, printLine } from '../utils/output';
import { getCliVersion } from '../utils/version';

const registry = new ExplanationRegistry();

function seedTraces(): void {
  const t1 = createDecisionTrace({
    decisionType: 'approve', context: 'PR #42 — dependency upgrade', signals: ['no_conflicts', 'tests_passing'],
    policyApplied: 'policy-approve-default', outcome: 'approved',
  });
  registry.registerTrace(t1);
  registry.registerExplanation(explainDecision(t1));
  registry.registerRationale(buildRationale(t1, []));

  const t2 = createDecisionTrace({
    decisionType: 'block', context: 'Deploy to production on Friday', signals: ['friday_deploy', 'no_emergency'],
    policyApplied: 'policy-deploy-freeze', outcome: 'blocked',
  });
  registry.registerTrace(t2);
  registry.registerExplanation(explainDecision(t2));
  const evidence = linkEvidence([
    { sourceType: 'policy', sourceRef: 'policy-deploy-freeze', description: 'Deploy freeze policy active on weekends' },
  ]);
  evidence.forEach(e => registry.registerEvidence(e));
  registry.registerRationale(buildRationale(t2, evidence));
}

export function decisionCommand(): Command {
  const cmd = new Command('decision')
    .description('Gerenciamento de decisões e trilhas — Fase 27');

  cmd
    .command('trace')
    .description('Cria e registra uma trilha de decisão')
    .argument('<decision-type>', 'Tipo da decisão')
    .argument('<context>', 'Contexto')
    .option('--signals <s>', 'Sinais separados por vírgula', '')
    .option('--policy <p>', 'Política', 'policy-default')
    .option('--outcome <o>', 'Resultado', 'approved')
    .option('--json', 'Saída em JSON')
    .action((decisionType: string, context: string, opts) => {
      try {
        const signals = opts.signals ? opts.signals.split(',').map((s: string) => s.trim()) : [];
        const trace = createDecisionTrace({ decisionType, context, signals, policyApplied: opts.policy, outcome: opts.outcome });
        registry.registerTrace(trace);

        const envelope = createEnvelope({
          ok: true, command: 'decision trace', version: getCliVersion(), data: { trace },
        });

        if (opts.json) { printLine(JSON.stringify(envelope, null, 2)); return; }

        printHeader('Trilha de Decisão');
        printLine(`  ID: ${trace.traceId}`);
        printLine(`  Tipo: ${trace.decisionType}`);
        printLine(`  Contexto: ${trace.context}`);
        printLine(`  Sinais: ${trace.signals.join(', ') || '(nenhum)'}`);
        printLine(`  Política: ${trace.policyApplied}`);
        printLine(`  Resultado: ${trace.outcome}`);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Erro na trilha: ${message}`);
        process.exit(1);
      }
    });

  cmd
    .command('show')
    .description('Mostra uma decisão registrada com explicação')
    .argument('<trace-id>', 'ID da trilha')
    .option('--json', 'Saída em JSON')
    .action((traceId: string, opts) => {
      try {
        const traces = registry.listTraces().filter(t => t.traceId === traceId);
        if (traces.length === 0) { console.error(`Trilha não encontrada: ${traceId}`); process.exit(1); }

        const trace = traces[0];
        const explanation = explainDecision(trace);
        const rationale = buildRationale(trace, registry.listEvidence());

        const envelope = createEnvelope({
          ok: true, command: 'decision show', version: getCliVersion(),
          data: { trace, explanation, rationale },
        });

        if (opts.json) { printLine(JSON.stringify(envelope, null, 2)); return; }

        printHeader(`Decisão: ${trace.traceId}`);
        printLine(`  Tipo: ${trace.decisionType} | Resultado: ${trace.outcome}`);
        printLine(`  Explicação: ${explanation.summary}`);
        for (const fact of rationale.facts) printLine(`  ${fact}`);
        for (const inf of rationale.inferences) printLine(`  ${inf}`);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Erro ao mostrar: ${message}`);
        process.exit(1);
      }
    });

  cmd
    .command('export')
    .description('Exporta relatório de decisões')
    .option('--seed', 'Popula dados de exemplo')
    .option('--json', 'Saída em JSON')
    .action((opts) => {
      try {
        if (opts.seed) seedTraces();

        const report = buildExplainReport({
          traces: registry.listTraces(),
          explanations: registry.listExplanations(),
          evidence: registry.listEvidence(),
          rationales: registry.listRationales(),
        });

        const envelope = createEnvelope({
          ok: true, command: 'decision export', version: getCliVersion(), data: report,
        });

        if (opts.json) { printLine(JSON.stringify(envelope, null, 2)); return; }

        printHeader('Relatório de Decisões');
        for (const note of report.notes) printLine(`  ${note}`);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Erro na exportação: ${message}`);
        process.exit(1);
      }
    });

  return cmd;
}
