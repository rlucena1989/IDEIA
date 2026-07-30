import { Command } from 'commander';
import { createLogger } from '@ideia/logger';
const logger = createLogger('commands.consistency');
import { ConsistencyEngine, classifyIntent, estimateComplexity, calculateRisk } from '../runtime/consistency-engine';
import { detectEquivalence } from '../runtime/equivalence-detector';
import { SolutionUpgrader } from '../runtime/solution-upgrader';
import { expandIntent, assessRisk } from '../runtime/intent-expander';
import * as fs from 'fs';
import { buildConsistencyReport } from '../state/consistency-builder';
import { checkConsistency } from '../hardening/consistency-checker';
import { createOkOutput } from '../hardening/output-contract';
import { getCliVersion } from '../utils/version';

/**
 * Cria consistency command.
 * @returns O resultado da operação.
 */
function createConsistencyCommand(): Command {
  const command = new Command('consistency')
    .description('Engine de Consistencia Intuitiva — Fase 8/9');

  command
    .command('evaluate <file>')
    .description('Avalia consistencia de um arquivo contra padroes conhecidos')
    .option('--json', 'Saida em JSON')
    .action((file, opts) => {
      if (!fs.existsSync(file)) { console.error(`Arquivo nao encontrado: ${file}`); process.exit(1); }
      const content = fs.readFileSync(file, 'utf-8');
      const engine = new ConsistencyEngine();
      const report = engine.evaluate(content, file);

      if (opts.json) { console.log(JSON.stringify(report, null, 2)); return; }

      logger.info('\nConsistencia Engine — "${file}":');
      logger.info('  ${report.summary}');
      for (const d of report.decisions) {
        const icon = d.mode === 'preserve' ? 'P' : d.mode === 'adapt' ? 'A' : d.mode === 'replace' ? 'R' : 'C';
        logger.info('  [${icon}] ${d.patternId.padEnd(25)} conf:${(d.confidence * 100).toFixed(0)}% — ${d.reason.substring(0, 80)}');
        if (d.riskWarning) logger.info('         ⚠ ${d.riskWarning}');
      }
    });

  command
    .command('classify <file>')
    .description('Classifica a intencao da mudanca')
    .option('--json', 'Saida em JSON')
    .action((file, opts) => {
      if (!fs.existsSync(file)) { console.error(`Arquivo nao encontrado: ${file}`); process.exit(1); }
      const content = fs.readFileSync(file, 'utf-8');
      const intent = classifyIntent(content, file);
      const complexity = estimateComplexity(content);
      const risk = calculateRisk(intent, complexity, 0);
      const expanded = expandIntent(intent, content);
      const riskAssessment = assessRisk(intent, complexity, content);

      if (opts.json) { console.log(JSON.stringify({ intent, complexity, risk, expanded, riskAssessment }, null, 2)); return; }

      logger.info('\nClassificacao de "${file}":');
      logger.info('  Intencao: ${intent}');
      logger.info('  Complexidade: ${complexity}/10');
      logger.info('  Risco: ${risk} | Risco pos-mitigacao: ${riskAssessment.mitigatedRisk}');
      logger.info('  Escopo: ${expanded.scope}');
      logger.info('  Impacto: ${expanded.impactAreas.join(\', \')}');
      logger.info('\n  Recomendacoes:');
      for (const r of expanded.recommendations) logger.info('    - ${r}');
      logger.info('\n  Fatores de risco:');
      for (const f of riskAssessment.factors) {
        if (f.severity > 0.05) logger.info('    ${f.name}: impacto=${f.impact}, probabilidade=${f.probability}, severidade=${f.severity} — ${f.mitigation}');
      }
    });

  command
    .command('equivalent <fileA> <fileB>')
    .description('Detecta equivalencia estrutural entre dois arquivos')
    .option('--json', 'Saida em JSON')
    .action((fileA, fileB, opts) => {
      if (!fs.existsSync(fileA)) { console.error(`Arquivo nao encontrado: ${fileA}`); process.exit(1); }
      if (!fs.existsSync(fileB)) { console.error(`Arquivo nao encontrado: ${fileB}`); process.exit(1); }
      const contentA = fs.readFileSync(fileA, 'utf-8');
      const contentB = fs.readFileSync(fileB, 'utf-8');
      const result = detectEquivalence(contentA, contentB);

      if (opts.json) { console.log(JSON.stringify(result, null, 2)); return; }

      logger.info('\nEquivalencia entre "${fileA}" e "${fileB}":');
      logger.info('  Similaridade estrutural: ${(result.structuralSimilarity * 100).toFixed(0)}%');
      logger.info('  Similaridade semantica: ${(result.semanticSimilarity * 100).toFixed(0)}%');
      logger.info('  Similaridade geral: ${(result.overallSimilarity * 100).toFixed(0)}%');
      logger.info('  Equivalentes: ${result.equivalent ? \'SIM\' : \'NAO\'}');
      if (result.confidence < 0.95) logger.info('  Confianca: ${(result.confidence * 100).toFixed(0)}%');
      for (const d of result.differences) logger.info('  Diferenca: ${d}');
    });

  command
    .command('upgrade <file>')
    .description('Detecta oportunidades de upgrade no codigo')
    .option('--json', 'Saida em JSON')
    .action((file, opts) => {
      if (!fs.existsSync(file)) { console.error(`Arquivo nao encontrado: ${file}`); process.exit(1); }
      const content = fs.readFileSync(file, 'utf-8');
      const upgrader = new SolutionUpgrader();
      const plan = upgrader.analyze(content);

      if (opts.json) { console.log(JSON.stringify(plan, null, 2)); return; }

      logger.info('\nUpgrade Analysis — "${file}":');
      logger.info('  ${plan.summary}');
      for (const s of plan.suggestions) {
        const icon = s.breaking ? '!' : ' ';
        logger.info('  [${icon}] ${s.id.padEnd(25)} ${s.description.padEnd(50)} esforco:${s.effort} risco:${s.risk}');
        logger.info('         ${s.oldPattern} → ${s.newPattern.substring(0, 60)}');
      }
    });

  command
    .command('matrix')
    .description('Matriz de consistência entre docs, código, testes, CLI e extensão — Fase 8')
    .option('--json', 'Saída em JSON')
    .action((opts) => {
      const report = buildConsistencyReport();
      const result = checkConsistency(report);
      const output = createOkOutput('consistency matrix', getCliVersion(), {
        consistency: result,
        items: report.items,
      });

      if (opts.json) {
        console.log(JSON.stringify(output, null, 2));
        return;
      }

      logger.info('\nMatriz de Consistência — ${report.generatedAt}:');
      logger.info('  Status geral: ${result.ok ? \'OK\' : \'ATENÇÃO\'}');
      logger.info('  Áreas com atenção: ${result.attentionCount}');
      logger.info('  Áreas bloqueadas: ${result.blockedCount}');
      for (const item of report.items) {
        const icon = item.status === 'ok' ? '✅' : item.status === 'attention' ? '⚠️' : '❌';
        logger.info('  ${icon} ${item.area}');
        logger.info('     docs=${item.docs} code=${item.code} tests=${item.tests} cli=${item.cli} ext=${item.extension}');
        for (const note of item.notes) logger.info('     → ${note}');
      }
      for (const s of report.summary) logger.info('  ℹ ${s}');
    });

  return command;
}

export { createConsistencyCommand };
