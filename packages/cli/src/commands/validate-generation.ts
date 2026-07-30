import { Command } from 'commander';
import { createLogger } from '@ideia/logger';
import * as fs from 'node:fs';
import { GenerationScope } from '../generation/artifact-types';
import { runDemandGeneration } from '../generation/generation-context';
import { createOkOutput } from '../hardening/output-contract';
import { printHeader, printLine, printResult } from '../utils/output';
import { getCliVersion } from '../utils/version';

export function validateGenerationCommand(): Command {
  const cmd = new Command('validate-generation')
    .description('Valida artefatos gerados sob demanda — Fase 8');

  cmd
    .command('run')
    .description('Valida artefatos gerados')
    .argument('<scope-file>', 'Caminho para arquivo JSON de escopo')
    .option('--json', 'Saída em JSON')
    .action((scopeFile: string, opts) => {
      try {
        if (!fs.existsSync(scopeFile)) {
          console.error(`Arquivo de escopo não encontrado: ${scopeFile}`);
          process.exit(1);
        }

        const raw = fs.readFileSync(scopeFile, 'utf-8');
        const scope: GenerationScope = JSON.parse(raw);
        const { artifacts, validation } = runDemandGeneration(scope);
        const output = createOkOutput('validate-generation run', getCliVersion(), {
          validation,
          artifactCount: artifacts.length,
        });

        if (opts.json) {
          printLine(JSON.stringify(output, null, 2));
          return;
        }

        printHeader('Validação de Geração');
        printResult('Válido', validation.ok, `${artifacts.length} artefato(s) gerado(s)`);
        for (const issue of validation.issues) printLine(`  ⚠ ${issue}`);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Erro na validação: ${message}`);
        process.exit(1);
      }
    });

  return cmd;
}
