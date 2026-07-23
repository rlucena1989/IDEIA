import { Command } from 'commander';
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

      console.log(`\nConsistencia Engine — "${file}":`);
      console.log(`  ${report.summary}`);
      for (const d of report.decisions) {
        const icon = d.mode === 'preserve' ? 'P' : d.mode === 'adapt' ? 'A' : d.mode === 'replace' ? 'R' : 'C';
        console.log(`  [${icon}] ${d.patternId.padEnd(25)} conf:${(d.confidence * 100).toFixed(0)}% — ${d.reason.substring(0, 80)}`);
        if (d.riskWarning) console.log(`         ⚠ ${d.riskWarning}`);
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

      console.log(`\nClassificacao de "${file}":`);
      console.log(`  Intencao: ${intent}`);
      console.log(`  Complexidade: ${complexity}/10`);
      console.log(`  Risco: ${risk} | Risco pos-mitigacao: ${riskAssessment.mitigatedRisk}`);
      console.log(`  Escopo: ${expanded.scope}`);
      console.log(`  Impacto: ${expanded.impactAreas.join(', ')}`);
      console.log(`\n  Recomendacoes:`);
      for (const r of expanded.recommendations) console.log(`    - ${r}`);
      console.log(`\n  Fatores de risco:`);
      for (const f of riskAssessment.factors) {
        if (f.severity > 0.05) console.log(`    ${f.name}: impacto=${f.impact}, probabilidade=${f.probability}, severidade=${f.severity} — ${f.mitigation}`);
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

      console.log(`\nEquivalencia entre "${fileA}" e "${fileB}":`);
      console.log(`  Similaridade estrutural: ${(result.structuralSimilarity * 100).toFixed(0)}%`);
      console.log(`  Similaridade semantica: ${(result.semanticSimilarity * 100).toFixed(0)}%`);
      console.log(`  Similaridade geral: ${(result.overallSimilarity * 100).toFixed(0)}%`);
      console.log(`  Equivalentes: ${result.equivalent ? 'SIM' : 'NAO'}`);
      if (result.confidence < 0.95) console.log(`  Confianca: ${(result.confidence * 100).toFixed(0)}%`);
      for (const d of result.differences) console.log(`  Diferenca: ${d}`);
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

      console.log(`\nUpgrade Analysis — "${file}":`);
      console.log(`  ${plan.summary}`);
      for (const s of plan.suggestions) {
        const icon = s.breaking ? '!' : ' ';
        console.log(`  [${icon}] ${s.id.padEnd(25)} ${s.description.padEnd(50)} esforco:${s.effort} risco:${s.risk}`);
        console.log(`         ${s.oldPattern} → ${s.newPattern.substring(0, 60)}`);
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

      console.log(`\nMatriz de Consistência — ${report.generatedAt}:`);
      console.log(`  Status geral: ${result.ok ? 'OK' : 'ATENÇÃO'}`);
      console.log(`  Áreas com atenção: ${result.attentionCount}`);
      console.log(`  Áreas bloqueadas: ${result.blockedCount}`);
      for (const item of report.items) {
        const icon = item.status === 'ok' ? '✅' : item.status === 'attention' ? '⚠️' : '❌';
        console.log(`  ${icon} ${item.area}`);
        console.log(`     docs=${item.docs} code=${item.code} tests=${item.tests} cli=${item.cli} ext=${item.extension}`);
        for (const note of item.notes) console.log(`     → ${note}`);
      }
      for (const s of report.summary) console.log(`  ℹ ${s}`);
    });

  return command;
}

export { createConsistencyCommand };
