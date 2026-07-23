/**
 * Comando `polyglot` — superfície executável do Adapter Runtime (R35).
 *
 * Expõe detecção de linguagens e execução de comandos (init/lint/test/build/
 * compile/quality-gate) por linguagem via {@link AdapterRuntime}.
 *
 * @module commands/polyglot
 */

import { Command } from 'commander';
import { AdapterRuntime, defaultRuntime } from '../runtime/adapter-runtime';
import { AdapterCommandId, LanguageId, RunStatus } from '../runtime/adapter-contract';

/**
 * Cria o comando `polyglot`.
 * @param runtime - Runtime opcional (padrão: singleton).
 * @returns Instância do comando commander.
 */
export function polyglotCommand(runtime: AdapterRuntime = defaultRuntime): Command {
  const cmd = new Command('polyglot').description('Runtime poliglota: detecta e executa comandos por linguagem');

  cmd
    .command('list')
    .description('Lista runners registrados e suas linguagens')
    .action(() => {
      const runners = runtime.listRunners();
      console.log(`Runners registrados (${runners.length}):\n`);
      for (const r of runners) {
        const cmds = r.commands().map((c) => c.id).join(', ');
        console.log(`- ${r.name} [${r.language}] aliases: ${r.aliases.join(', ')}`);
        console.log(`    comandos: ${cmds}`);
      }
    });

  cmd
    .command('languages')
    .description('Lista linguagens suportadas (com runner)')
    .action(() => {
      console.log(runtime.getSupportedLanguages().join(', '));
    });

  cmd
    .command('languages-all')
    .description('Lista todas as linguagens (runners + scaffold-only)')
    .action(() => {
      const all = runtime.getAllSupportedLanguages();
      const runners = runtime.getSupportedLanguages();
      for (const lang of all) {
        const tag = runners.includes(lang) ? '' : ' [scaffold-only]';
        console.log(`  ${lang}${tag}`);
      }
    });

  cmd
    .command('detect')
    .description('Detecta linguagens em um diretório')
    .argument('[dir]', 'diretório alvo', '.')
    .action((dir: string) => {
      const result = runtime.detect(dir);
      console.log(`Linguagens detectadas em "${dir}":`);
      if (result.languages.length === 0) {
        console.log('  (nenhuma com runner disponível)');
      } else {
        for (const lang of result.languages) {
          console.log(`  - ${lang}${lang === result.primary ? '  [primária]' : ''}`);
        }
      }
      if (result.raw.length > 0) {
        console.log(`Marcadores crus: ${result.raw.join(', ')}`);
      }
    });

  cmd
    .command('run')
    .description('Executa um comando em uma linguagem')
    .argument('<language>', 'identificador da linguagem (ex.: go, python, node, java)')
    .argument('<command>', 'init | lint | test | build | compile | quality-gate')
    .argument('[dir]', 'diretório alvo', '.')
    .option('--timeout <ms>', 'tempo limite em ms', '120000')
    .action(async (language: string, command: string, dir: string, options: { timeout: string }) => {
      const lang = resolveLanguage(language, runtime);
      if (!lang) {
        console.error(`❌ Linguagem desconhecida: ${language}`);
        process.exitCode = 1;
        return;
      }
      const commandId = command as AdapterCommandId;
      if (!Object.values(AdapterCommandId).includes(commandId)) {
        console.error(`❌ Comando inválido: ${command}`);
        process.exitCode = 1;
        return;
      }
      const result = await runtime.execute(lang, commandId, dir, { timeoutMs: Number(options.timeout) });
      const icon = result.status === RunStatus.Success ? '✅' : result.status === RunStatus.Skipped ? '⏭️' : '❌';
      console.log(`${icon} ${result.status} (${result.durationMs}ms)`);
      if (result.stdout) console.log(result.stdout);
      if (result.stderr) console.error(result.stderr);
      if (result.status === RunStatus.Failure || result.status === RunStatus.Timeout) process.exitCode = 1;
    });

  cmd
    .command('quality-gate')
    .description('Executa portões de qualidade para as linguagens detectadas (fallback Node)')
    .argument('[dir]', 'diretório alvo', '.')
    .action(async (dir: string) => {
      const results = await runtime.getQualityGates(dir);
      let failed = 0;
      for (const r of results) {
        const icon = r.status === RunStatus.Success ? '✅' : r.status === RunStatus.Skipped ? '⏭️' : '❌';
        console.log(`${icon} ${r.language}/${r.command} -> ${r.status} (${r.durationMs}ms)`);
        if (r.status === RunStatus.Failure || r.status === RunStatus.Timeout) failed++;
      }
      if (failed > 0) process.exitCode = 1;
    });

  cmd
    .command('discover')
    .description('Descobre adapters scaffold nos pacotes')
    .argument('[dir]', 'diretório packages/', 'packages')
    .action(async (dir: string) => {
      const manifests = await runtime.discoverAdapters(dir);
      const runners = runtime.listRunners().map(r => r.language);
      console.log(`Adapters scaffold encontrados (${manifests.length}):\n`);
      for (const m of manifests) {
        const hasRunner = runners.includes(m.language);
        const tag = hasRunner ? '✅ executável' : '📋 scaffold-only';
        console.log(`  ${m.id.padEnd(20)} ${m.language.padEnd(14)} ${tag}`);
      }
      const scaffoldable = manifests.filter(m => !runners.includes(m.language)).length;
      console.log(`\nResumo: ${manifests.length} scaffold total, ${manifests.length - scaffoldable} executável, ${scaffoldable} scaffold-only`);
    });

  return cmd;
}

/**
 * Resolve um identificador/alias para LanguageId.
 * @param input - Nome, alias ou LanguageId.
 * @param runtime - Runtime para consultar aliases.
 * @returns LanguageId ou null.
 */
function resolveLanguage(input: string, runtime: AdapterRuntime): LanguageId | null {
  const lowered = input.toLowerCase();
  for (const runner of runtime.listRunners()) {
    if (runner.language === lowered || runner.aliases.includes(lowered)) return runner.language;
  }
  if ((Object.values(LanguageId) as string[]).includes(lowered)) return lowered as LanguageId;
  return null;
}
