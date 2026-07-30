import { Command } from 'commander';
import { createLogger } from '@ideia/logger';
import { ExplanationRegistry } from '../explanation/explanation-registry';
import { createDecisionTrace } from '../explanation/decision-trace';
import { explainDecision } from '../explanation/explanation-engine';
import { buildRationale } from '../explanation/rationale-builder';
import { linkEvidence } from '../explanation/evidence-linker';
import { DEFAULT_TRANSPARENCY_POLICY } from '../explanation/transparency-policy';
import { createEnvelope } from '../hardening/output-contract';
import { printHeader, printLine, printResult } from '../utils/output';
import { getCliVersion } from '../utils/version';

const registry = new ExplanationRegistry();

export function explainCommand(): Command {
  const cmd = new Command('explain')
    .description('Autoexplicação e transparência decisional — Fase 27');

  cmd
    .command('decision')
    .description('Explica uma decisão a partir de seus parâmetros')
    .argument('<decision-type>', 'Tipo da decisão')
    .argument('<context>', 'Contexto da decisão')
    .option('--signals <s>', 'Sinais separados por vírgula', '')
    .option('--policy <p>', 'Política aplicada', DEFAULT_TRANSPARENCY_POLICY.policyId)
    .option('--outcome <o>', 'Resultado', 'approved')
    .option('--json', 'Saída em JSON')
    .action((decisionType: string, context: string, opts) => {
      try {
        const signals = opts.signals ? opts.signals.split(',').map((s: string) => s.trim()) : [];
        const trace = createDecisionTrace({ decisionType, context, signals, policyApplied: opts.policy, outcome: opts.outcome });
        registry.registerTrace(trace);
        const explanation = explainDecision(trace);
        registry.registerExplanation(explanation);

        const envelope = createEnvelope({
          ok: true, command: 'explain decision', version: getCliVersion(),
          data: { trace, explanation },
        });

        if (opts.json) { printLine(JSON.stringify(envelope, null, 2)); return; }

        printHeader('Explicação da Decisão');
        printLine(`  ${explanation.title}`);
        printLine(`  Resumo: ${explanation.summary}`);
        for (const detail of explanation.details) {
          printLine(`  ${detail}`);
        }
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Erro na explicação: ${message}`);
        process.exit(1);
      }
    });

  cmd
    .command('policy')
    .description('Exibe a política de transparência atual')
    .option('--json', 'Saída em JSON')
    .action((opts) => {
      try {
        const policy = DEFAULT_TRANSPARENCY_POLICY;
        const envelope = createEnvelope({
          ok: true, command: 'explain policy', version: getCliVersion(), data: { policy },
        });

        if (opts.json) { printLine(JSON.stringify(envelope, null, 2)); return; }

        printHeader('Política de Transparência');
        printLine(`  Critical decisions: ${policy.explainCriticalDecisions}`);
        printLine(`  Blocked actions:   ${policy.explainBlockedActions}`);
        printLine(`  Recommendations:   ${policy.explainRecommendations}`);
        printLine(`  Evidence links:    ${policy.includeEvidenceLinks}`);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Erro na política: ${message}`);
        process.exit(1);
      }
    });

  cmd
    .command('block')
    .description('Explica o motivo de um bloqueio')
    .argument('<reason>', 'Motivo do bloqueio')
    .option('--context <c>', 'Contexto do bloqueio', 'unknown')
    .option('--policy <p>', 'Política que bloqueou', DEFAULT_TRANSPARENCY_POLICY.policyId)
    .option('--json', 'Saída em JSON')
    .action((reason: string, opts) => {
      try {
        const trace = createDecisionTrace({
          decisionType: 'block',
          context: opts.context,
          signals: [`block_reason:${reason}`],
          policyApplied: opts.policy,
          outcome: 'blocked',
        });
        registry.registerTrace(trace);
        const explanation = explainDecision(trace);
        registry.registerExplanation(explanation);
        const rationale = buildRationale(trace, []);
        registry.registerRationale(rationale);

        const envelope = createEnvelope({
          ok: true, command: 'explain block', version: getCliVersion(),
          data: { trace, explanation, rationale },
        });

        if (opts.json) { printLine(JSON.stringify(envelope, null, 2)); return; }

        printHeader('Explicação do Bloqueio');
        printLine(`  Motivo: ${reason}`);
        printLine(`  Contexto: ${opts.context}`);
        printLine(`  Política: ${opts.policy}`);
        printLine(`  Resumo: ${explanation.summary}`);
        for (const fact of rationale.facts) printLine(`  ${fact}`);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Erro no bloqueio: ${message}`);
        process.exit(1);
      }
    });

  cmd
    .command('privacy')
    .description('Right to explanation — RGPD Art. 22 / LGPD Art. 20')
    .argument('<decision-id>', 'ID da decisão automatizada')
    .option('--output <format>', 'Formato de saída (text, json)', 'text')
    .option('--human-readable', 'Gera explicação em linguagem natural', true)
    .action((decisionId: string, opts) => {
      try {
        const trace = (registry as any).getTrace(decisionId) || createDecisionTrace({
          decisionType: 'automated',
          context: decisionId,
          signals: [`decision_id:${decisionId}`],
          policyApplied: DEFAULT_TRANSPARENCY_POLICY.policyId,
          outcome: 'approved',
        });
        const explanation = explainDecision(trace);
        const rationale = buildRationale(trace, []);

        const envelope = createEnvelope({
          ok: true, command: 'explain privacy', version: getCliVersion(),
          data: { trace, explanation, rationale,
            lgpd: { article: 'Art. 20', right: 'Revisão de decisões automatizadas' },
            gdpr: { article: 'Art. 22', right: 'Automated individual decision-making' },
          },
        });

        if (opts.output === 'json' || opts.json) { printLine(JSON.stringify(envelope, null, 2)); return; }

        printHeader('Direito à Explicação (LGPD Art. 20 / GDPR Art. 22)');
        printLine(`  Decisão ID: ${decisionId}`);
        printLine(`  Tipo: ${trace.decisionType}`);
        printLine(`  Resultado: ${trace.outcome}`);
        printLine(`  Contexto: ${trace.context}`);
        printLine(`  Política aplicada: ${trace.policyApplied}`);
        printLine(`  Explicação: ${explanation.title}`);
        printLine(`  Resumo: ${explanation.summary}`);
        for (const detail of explanation.details) printLine(`  Detalhe: ${detail}`);
        for (const fact of rationale.facts) printLine(`  Fato: ${fact}`);
        printLine('');
        printLine('Base legal:');
        printLine('  LGPD Art. 20 — Direito de solicitar revisão de decisões automatizadas');
        printLine('  GDPR Art. 22 — Right not to be subject to automated decision-making');
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Erro na explicação de privacidade: ${message}`);
        process.exit(1);
      }
    });

  return cmd;
}
