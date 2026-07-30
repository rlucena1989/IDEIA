import { Command } from 'commander';
import { createLogger } from '@ideia/logger';
import { buildPublicationPlan } from '../publication/publication-builder';
import { validatePublication } from '../publication/publication-validator';
import { routePublication } from '../publication/publication-router';
import { buildPublicationReport } from '../publication/publication-report';
import { createEnvelope } from '../hardening/output-contract';
import { printHeader, printLine, printResult } from '../utils/output';
import { getCliVersion } from '../utils/version';

export function publishCommand(): Command {
  const cmd = new Command('publish')
    .description('Publicação operacional validada — Fase 12');

  cmd
    .command('plan')
    .description('Cria um plano de publicação')
    .argument('<title>', 'Título da publicação')
    .argument('<summary>', 'Resumo da publicação')
    .option('--content <content>', 'Conteúdo', 'Conteúdo gerado sob demanda')
    .option('--target <target>', 'Alvo: cli, extension, file, json', 'cli')
    .option('--json', 'Saída em JSON')
    .action((title: string, summary: string, opts) => {
      try {
        const plan = buildPublicationPlan(title, summary, opts.content, opts.target);
        const envelope = createEnvelope({
          ok: true, command: 'publish plan', version: getCliVersion(),
          data: plan,
        });

        if (opts.json) { printLine(JSON.stringify(envelope, null, 2)); return; }

        printHeader('Plano de Publicação');
        printLine(`  Título: ${plan.payload.title}`);
        printLine(`  Resumo: ${plan.payload.summary.substring(0, 60)}...`);
        printLine(`  Alvo: ${plan.target.kind}`);
        printResult('Validado', plan.validated);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Erro ao criar plano: ${message}`);
        process.exit(1);
      }
    });

  cmd
    .command('validate')
    .description('Valida um plano de publicação')
    .argument('<title>', 'Título')
    .argument('<summary>', 'Resumo')
    .option('--content <content>', 'Conteúdo', 'Conteúdo gerado sob demanda')
    .option('--json', 'Saída em JSON')
    .action((title: string, summary: string, opts) => {
      try {
        const plan = buildPublicationPlan(title, summary, opts.content, 'cli');
        const result = validatePublication(plan);
        const envelope = createEnvelope({
          ok: result.ok, command: 'publish validate', version: getCliVersion(),
          data: result,
        });

        if (opts.json) { printLine(JSON.stringify(envelope, null, 2)); return; }

        printHeader('Validação de Publicação');
        printResult('Válido', result.ok);
        for (const issue of result.issues) printLine(`  ⚠ ${issue}`);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Erro na validação: ${message}`);
        process.exit(1);
      }
    });

  cmd
    .command('run')
    .description('Publica um plano validado no alvo especificado')
    .argument('<title>', 'Título')
    .argument('<summary>', 'Resumo')
    .option('--content <content>', 'Conteúdo', 'Conteúdo gerado sob demanda')
    .option('--target <target>', 'Alvo', 'cli')
    .option('--json', 'Saída em JSON')
    .action((title: string, summary: string, opts) => {
      try {
        const plan = buildPublicationPlan(title, summary, opts.content, opts.target);
        const result = routePublication(plan);
        const envelope = createEnvelope({
          ok: result.ok, command: 'publish run', version: getCliVersion(),
          data: result,
        });

        if (opts.json) { printLine(JSON.stringify(envelope, null, 2)); return; }

        printHeader('Publicação');
        printResult('Status', result.ok, result.ok ? 'Publicado' : 'Falhou');
        printLine(`  Alvo: ${result.target}`);
        printLine(`  Publicado em: ${result.publishedAt}`);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Erro na publicação: ${message}`);
        process.exit(1);
      }
    });

  cmd
    .command('report')
    .description('Relatório de publicações')
    .option('--json', 'Saída em JSON')
    .action((opts) => {
      try {
        const plan1 = buildPublicationPlan('Release v2', 'Nova versão do CLI', 'Conteúdo da release', 'cli');
        const plan2 = buildPublicationPlan('Doc Update', 'Atualização de docs', 'Conteúdo atualizado', 'json');
        const result1 = routePublication(plan1);
        const result2 = routePublication(plan2);
        const report = buildPublicationReport([result1, result2]);
        const envelope = createEnvelope({
          ok: true, command: 'publish report', version: getCliVersion(),
          data: report,
        });

        if (opts.json) { printLine(JSON.stringify(envelope, null, 2)); return; }

        printHeader('Relatório de Publicações');
        for (const s of report.summary) printLine(`  ℹ ${s}`);
        for (const r of report.results) {
          printLine(`  ${r.ok ? '✅' : '❌'} ${r.plan.payload.title} → ${r.target}`);
        }
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Erro no relatório: ${message}`);
        process.exit(1);
      }
    });

  return cmd;
}
