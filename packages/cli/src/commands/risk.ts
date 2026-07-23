import { Command } from 'commander';
import { assessRisk, RiskAssessment } from '../prediction/risk-model';
import { DEFAULT_RISK_THRESHOLDS } from '../prediction/risk-thresholds';
import { createEnvelope } from '../hardening/output-contract';
import { printHeader, printLine } from '../utils/output';
import { getCliVersion } from '../utils/version';

const assessments: RiskAssessment[] = [];

export function riskCommand(): Command {
  const cmd = new Command('risk')
    .description('Modelo de risco e classificação — Fase 28');

  cmd
    .command('assess')
    .description('Avalia risco de um sujeito/componente')
    .argument('<subject>', 'Sujeito avaliado')
    .option('--likelihood <n>', 'Score de probabilidade (0-10)', '5')
    .option('--impact <n>', 'Score de impacto (0-10)', '5')
    .option('--json', 'Saída em JSON')
    .action((subject: string, opts) => {
      try {
        const likelihoodScore = Math.min(10, Math.max(0, parseInt(opts.likelihood, 10) || 0));
        const impactScore = Math.min(10, Math.max(0, parseInt(opts.impact, 10) || 0));
        const assessment = assessRisk(subject, likelihoodScore, impactScore);
        assessments.push(assessment);

        const envelope = createEnvelope({
          ok: true, command: 'risk assess', version: getCliVersion(), data: assessment,
        });

        if (opts.json) { printLine(JSON.stringify(envelope, null, 2)); return; }

        printHeader('Avaliação de Risco');
        printLine(`  Sujeito: ${assessment.subject}`);
        printLine(`  Probabilidade: ${assessment.likelihood} (score: ${likelihoodScore})`);
        printLine(`  Impacto: ${assessment.impact} (score: ${impactScore})`);
        printLine(`  Score total: ${assessment.score}`);
        printLine(`  Classificação: ${assessment.score < DEFAULT_RISK_THRESHOLDS.low ? 'baixo' : assessment.score < DEFAULT_RISK_THRESHOLDS.moderate ? 'moderado' : assessment.score < DEFAULT_RISK_THRESHOLDS.high ? 'alto' : 'crítico'}`);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Erro na avaliação: ${message}`);
        process.exit(1);
      }
    });

  cmd
    .command('list')
    .description('Lista avaliações de risco registradas')
    .option('--json', 'Saída em JSON')
    .action((opts) => {
      try {
        const envelope = createEnvelope({
          ok: true, command: 'risk list', version: getCliVersion(),
          data: { count: assessments.length, assessments },
        });

        if (opts.json) { printLine(JSON.stringify(envelope, null, 2)); return; }

        printHeader('Riscos Registrados');
        printLine(`  Total: ${assessments.length}`);
        for (const a of assessments.slice(-10)) {
          printLine(`  ${a.subject} | prob: ${a.likelihood} | impacto: ${a.impact} | score: ${a.score}`);
        }
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Erro ao listar: ${message}`);
        process.exit(1);
      }
    });

  cmd
    .command('watch')
    .description('Exibe thresholds de risco atuais')
    .option('--json', 'Saída em JSON')
    .action((opts) => {
      try {
        const thresholds = DEFAULT_RISK_THRESHOLDS;
        const envelope = createEnvelope({
          ok: true, command: 'risk watch', version: getCliVersion(), data: { thresholds },
        });

        if (opts.json) { printLine(JSON.stringify(envelope, null, 2)); return; }

        printHeader('Thresholds de Risco');
        printLine(`  Baixo: < ${thresholds.low}`);
        printLine(`  Moderado: < ${thresholds.moderate}`);
        printLine(`  Alto: < ${thresholds.high}`);
        printLine(`  Crítico: >= ${thresholds.high}`);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Erro nos thresholds: ${message}`);
        process.exit(1);
      }
    });

  return cmd;
}
