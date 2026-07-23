import { Command } from 'commander';
import { normalizeRequest, formatRequestOverview } from '../runtime/request-normalizer';
import { detectAmbiguity } from '../runtime/ambiguity-detector';
import { detectStack } from '../runtime/stack-detector';
import { analyzeLayout } from '../runtime/layout-analyzer';
import { analyzeUX } from '../runtime/ux-analyzer';
import * as fs from 'fs';

/**
 * Cria multimodal command.
 * @returns O resultado da operação.
 */
function createMultimodalCommand(): Command {
  const command = new Command('multimodal')
    .description('Entrada Multimodal e Design-to-Code — Fase 10');

  command
    .command('normalize <text>')
    .description('Normaliza uma requisicao textual')
    .option('--source <type>', 'Fonte da entrada (text, voice, structured, hybrid)', 'text')
    .option('--json', 'Saida em JSON')
    .action((text, opts) => {
      const req = normalizeRequest({ source: opts.source, content: text });
      if (opts.json) { console.log(JSON.stringify(req, null, 2)); return; }
      console.log(formatRequestOverview(req));
    });

  command
    .command('analyze-ambiguity <file>')
    .description('Detecta ambiguidade em um arquivo de requisicao')
    .option('--json', 'Saida em JSON')
    .action((file, opts) => {
      if (!fs.existsSync(file)) { console.error('Arquivo nao encontrado:', file); process.exit(1); }
      const content = fs.readFileSync(file, 'utf-8');
      const report = detectAmbiguity(content);
      if (opts.json) { console.log(JSON.stringify(report, null, 2)); return; }
      console.log('\\nAnalise de Ambiguidade:');
      console.log('  Nivel:', report.overallAmbiguity);
      console.log('  Sinais:', report.total);
      for (const s of report.signals) {
        console.log('  [' + s.severity.toUpperCase() + ']', s.suggestion);
      }
      if (report.suggestions.length > 0) {
        console.log('\\nSugestoes de enriquecimento:');
        for (const sug of report.suggestions) {
          console.log('  -', sug.field + ':', sug.value);
        }
      }
    });

  command
    .command('detect-stack [rootDir]')
    .description('Detecta a stack de tecnologia do projeto')
    .option('--json', 'Saida em JSON')
    .action((rootDir, opts) => {
      const stack = detectStack(rootDir || undefined);
      if (opts.json) { console.log(JSON.stringify(stack, null, 2)); return; }
      console.log('\\nStack Detectada:');
      console.log('  Linguagem:', stack.language);
      console.log('  Framework:', stack.framework);
      console.log('  Package Manager:', stack.packageManager);
      console.log('  Database:', stack.database);
      console.log('  UI:', stack.ui);
      console.log('  Testing:', stack.testing);
      console.log('  CI:', stack.ci);
      console.log('  Confianca:', Math.round(stack.confidence * 100) + '%');
      console.log('  Evidencias:', stack.evidence.length);
    });

  command
    .command('analyze-layout <file>')
    .description('Analisa layout de um componente/frontend')
    .option('--json', 'Saida em JSON')
    .action((file, opts) => {
      if (!fs.existsSync(file)) { console.error('Arquivo nao encontrado:', file); process.exit(1); }
      const content = fs.readFileSync(file, 'utf-8');
      const report = analyzeLayout(content, file);
      if (opts.json) { console.log(JSON.stringify(report, null, 2)); return; }
      console.log('\\nAnalise de Layout:');
      console.log('  Framework:', report.framework);
      console.log('  Tipo:', report.layoutType);
      console.log('  Regioes:', report.totalRegions);
      for (const r of report.regions) {
        console.log('  -', r.role, '(' + r.classOrId + ')');
      }
      console.log('  Responsivo:', report.responsive ? 'Sim' : 'Nao');
      console.log('  Score:', report.score + '/100');
    });

  command
    .command('analyze-ux <file>')
    .description('Analisa experiencia do usuario em um arquivo')
    .option('--json', 'Saida em JSON')
    .action((file, opts) => {
      if (!fs.existsSync(file)) { console.error('Arquivo nao encontrado:', file); process.exit(1); }
      const content = fs.readFileSync(file, 'utf-8');
      const report = analyzeUX(content, file);
      if (opts.json) { console.log(JSON.stringify(report, null, 2)); return; }
      console.log('\\nAnalise de UX:');
      console.log('  ' + report.summary);
      for (const f of report.findings) {
        const icon = f.severity === 'error' ? 'E' : f.severity === 'warning' ? 'W' : 'I';
        console.log('  [' + icon + '] L' + f.line + ': ' + f.issue + ' — ' + f.suggestion);
      }
    });

  return command;
}

export { createMultimodalCommand };
