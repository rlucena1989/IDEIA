import { Command } from 'commander';
import path from 'node:path';
import { printLine, printResult } from "../utils/output";
import { listFrameworks, getFramework } from '../compliance/frameworks';
import { mapRulesToFramework, generateReport } from '../compliance/mapper';
import { getIO } from '../io';

const ROOT = process.cwd();

export function complianceMapAction(): void {
  const frameworks = listFrameworks();
  printLine(`Mapeando regras para ${frameworks.length} frameworks:\n`);

  for (const fwId of frameworks) {
    const mapping = mapRulesToFramework(ROOT, fwId);
    const bar = '█'.repeat(Math.round(mapping.score / 10)) + '░'.repeat(10 - Math.round(mapping.score / 10));
    printLine(`  ${mapping.frameworkName} (${fwId}): ${bar} ${mapping.score}% (${mapping.matched}/${mapping.total})`);
  }

  printLine('');
  printResult('Mapeamento concluido. Use "compliance report" para relatorio detalhado.', true);
}

export function complianceCheckAction(framework: string): void {
  const mapping = mapRulesToFramework(ROOT, framework);
  const fw = getFramework(framework);

  if (!fw) {
    printResult(`Framework "${framework}" nao encontrado. Disponiveis: ${listFrameworks().join(', ')}`, false);
    return;
  }

  printLine(`=== ${mapping.frameworkName} (${framework}) ===`);
  printLine(`Conformidade: ${mapping.score}% (${mapping.matched}/${mapping.total} requisitos)\n`);

  if (mapping.matches.length > 0) {
    printLine(`Regras correspondentes (${mapping.matches.length}):`);
    for (const m of mapping.matches) {
      printLine(`  ✓ ${m.requirement}: ${m.rule.slice(0, 70)}`);
    }
    printLine('');
  }

  if (mapping.gaps.length > 0) {
    printLine(`Lacunas (${mapping.gaps.length}):`);
    for (const gap of mapping.gaps) {
      printLine(`  ✗ ${gap}`);
    }
    printLine('');
  }
}

export function complianceReportAction(): void {
  const report = generateReport(ROOT);

  printLine('=== RELATORIO DE CONFORMIDADE ===\n');
  printLine(`Score geral: ${report.overallScore}%\n`);

  for (const m of report.mappings) {
    const bar = '█'.repeat(Math.round(m.score / 10)) + '░'.repeat(10 - Math.round(m.score / 10));
    printLine(`${m.frameworkName} (${m.framework}): ${bar} ${m.score}%`);
    printLine(`  Requisitos: ${m.matched}/${m.total} atendidos`);
    printLine(`  Gaps: ${m.gaps.length}`);
    printLine(`  Relatorio: .ai/reports/compliance/${m.framework}.json`);
    printLine('');
  }

  if (report.overallScore >= 80) {
    printResult(`Conformidade geral: ${report.overallScore}% — BOM`, true);
  } else if (report.overallScore >= 50) {
    printResult(`Conformidade geral: ${report.overallScore}% — MEDIO`, false);
  } else {
    printResult(`Conformidade geral: ${report.overallScore}% — BAIXO`, false);
  }
}

export function complianceGapAction(framework: string): void {
  const mapping = mapRulesToFramework(ROOT, framework);
  const fw = getFramework(framework);

  if (!fw) {
    printResult(`Framework "${framework}" nao encontrado.`, false);
    return;
  }

  if (mapping.gaps.length === 0) {
    printResult(`Nenhuma lacuna para ${mapping.frameworkName}. Todos os requisitos atendidos!`, true);
    return;
  }

  printLine(`Lacunas para ${mapping.frameworkName} (${mapping.gaps.length}):\n`);
  for (const gap of mapping.gaps) {
    printLine(`  ✗ ${gap}`);
  }
  printLine('');
  printLine(`Sugestao: Use "compliance import ${framework}" para importar regras sugeridas.`);
}

export function complianceBadgesAction(): void {
  const frameworks = listFrameworks();
  printLine('Badges de conformidade:\n');

  for (const fwId of frameworks) {
    const mapping = mapRulesToFramework(ROOT, fwId);
    const fw = getFramework(fwId);
    const status = mapping.score >= 80 ? 'passing' : mapping.score >= 50 ? 'partial' : 'failing';
    const color = status === 'passing' ? 'brightgreen' : status === 'partial' ? 'yellow' : 'red';
    const badge = `![${fwId}](${mapping.score}%-${color})`;
    printLine(`  ${fw?.name || fwId}: ${badge}`);
    printLine(`    Score: ${mapping.score}% (${mapping.matched}/${mapping.total})`);
  }
}

export function complianceImportAction(framework: string): void {
  const fw = getFramework(framework);
  if (!fw) {
    printResult(`Framework "${framework}" nao encontrado.`, false);
    return;
  }

  const templateDir = path.join(ROOT, '.ai/compliance/templates');
  getIO().fs.mkDir(templateDir, true);

  const content = `# Regras sugeridas para ${fw.name} (${fw.id})
# Adicione estas regras ao seu .ai/laws.yaml ou policy files

${fw.requirements.map(req => `# ${req.id}: ${req.title}
# ${req.description}
# Keywords: ${req.keywords.join(', ')}
- [${fw.id}] Implementar ${req.title.toLowerCase()}`).join('\n\n')}
`;

  const filePath = path.join(templateDir, `${fw.id}-rules.md`);
  getIO().fs.write(filePath, content);
  printResult(`Regras sugeridas para ${fw.name} importadas para ${filePath}`, true);
  printLine(`  Adicione manualmente as regras relevantes ao seu .ai/laws.yaml`);
}

/**
 * Processa command.
 * @returns O resultado da operação.
 */
export function complianceCommand(): Command {
  const cmd = new Command('compliance')
    .description('Mapeamento regulatorio e conformidade');

  cmd
    .command('map')
    .description('Mapeia regras atuais para frameworks regulatorios')
    .action(complianceMapAction);

  cmd
    .command('check')
    .description('Verifica conformidade com framework especifico')
    .argument('<framework>', `Framework: ${listFrameworks().join(', ')}`)
    .action(complianceCheckAction);

  cmd
    .command('report')
    .description('Gera relatorio completo de conformidade')
    .action(complianceReportAction);

  cmd
    .command('gap')
    .description('Mostra requisitos nao atendidos para framework')
    .argument('<framework>', `Framework: ${listFrameworks().join(', ')}`)
    .action(complianceGapAction);

  cmd
    .command('badges')
    .description('Gera badges de conformidade')
    .action(complianceBadgesAction);

  cmd
    .command('import')
    .description('Importa regras sugeridas para framework')
    .argument('<framework>', `Framework: ${listFrameworks().join(', ')}`)
    .action(complianceImportAction);

  return cmd;
}
