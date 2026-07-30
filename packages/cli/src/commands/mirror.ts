import { Command } from 'commander';
import { createLogger } from '@ideia/logger';
const logger = createLogger('commands.mirror');
import path from 'node:path';
import { loadMirrorConfig, saveMirrorConfig, queryEntries, getEntryBySeq, verifyChain, getEntryCount } from '../local-ai/mirror/ledger';
import { replayEntry, formatReplayResult } from '../local-ai/mirror/replayer';
import { setMirrorRoot } from '../local-ai/mirror/recorder';
import { printLine, printResult, finish } from '../utils/output';
import { getIO } from '../io';

const ROOT = process.cwd();
setMirrorRoot(ROOT);

/**
 * Processa command.
 * @returns O resultado da operação.
 */
export function mirrorCommand(): Command {
  const cmd = new Command('mirror')
    .description('AI Mirroring — interceptacao, registro e replay de chamadas de IA');

  cmd
    .command('record')
    .description('Ativa ou desativa a interceptacao automatica')
    .argument('<on|off|status>', 'on, off ou status')
    .action((action: string) => {
      if (action === 'status') {
        const config = loadMirrorConfig(ROOT);
        const count = getEntryCount(ROOT);
        printLine(`Mirror: ${config.enabled ? '🟢 ON' : '🔴 OFF'}`);
        printLine(`Entries: ${count}`);
        printLine(`Privacy: ${config.privacy_mode ? '🔒 Ativado (conteudo omitido)' : '🔓 Desativado'}`);
        return;
      }
      const config = loadMirrorConfig(ROOT);
      config.enabled = action === 'on';
      saveMirrorConfig(ROOT, config);
      printResult(`Mirror ${action === 'on' ? 'ativado' : 'desativado'}`, true);
    });

  cmd
    .command('query')
    .description('Busca entries gravados')
    .option('--prompt-hash <hash>', 'Filtrar por hash do prompt')
    .option('--model <model>', 'Filtrar por modelo')
    .option('--provider <provider>', 'Filtrar por provider')
    .option('--command <command>', 'Filtrar por comando')
    .option('--limit <n>', 'Limite de resultados', '20')
    .option('--offset <n>', 'Offset', '0')
    .action((options: Record<string, string>) => {
      const entries = queryEntries(ROOT, {
        promptHash: options['prompt-hash'],
        modelId: options.model,
        provider: options.provider,
        command: options.command,
        limit: parseInt(options.limit || '20', 10),
        offset: parseInt(options.offset || '0', 10),
      });

      if (entries.length === 0) {
        printLine('Nenhum entry encontrado.');
        return;
      }

      printLine(`Entries encontrados: ${entries.length}\n`);
      for (const e of entries) {
        const icon = e.status === 'success' ? '✅' : '❌';
        printLine(`  #${e.seq} ${icon} ${e.modelId} (${e.provider}) — ${e.command} — ${e.latencyMs}ms`);
        printLine(`     Hash: ${e.promptHash.substring(0, 16)}...`);
        if (e.response) printLine(`     Resposta: ${e.response.substring(0, 100).replace(/\n/g, ' ')}...`);
        printLine('');
      }
    });

  cmd
    .command('replay')
    .description('Re-executa prompt de um entry gravado')
    .argument('<seq>', 'Numero sequencial do entry')
    .option('--model <model>', 'Modelo diferente para o replay')
    .option('--provider <provider>', 'Provider diferente')
    .option('--timeout <ms>', 'Timeout em ms', '30000')
    .action(async (seqStr: string, options: Record<string, string>) => {
      const seq = parseInt(seqStr, 10);
      const entry = getEntryBySeq(ROOT, seq);
      if (!entry) {
        printResult('Erro', false, `Entry #${seq} nao encontrado`);
        return;
      }

      if (!entry.prompt) {
        printResult('Erro', false, 'Entry sem prompt (privacy mode ativo)');
        return;
      }

      printLine(`Replay de #${seq}: "${entry.modelId}" (${entry.provider})`);
      if (options.model || options.provider) {
        const model = options.model || entry.modelId;
        const provider = options.provider || entry.provider;
        printLine(`→ Contra: "${model}" (${provider})`);
      }
      printLine('');

      const result = await replayEntry(entry, ROOT, {
        modelId: options.model,
        provider: options.provider,
        timeoutMs: parseInt(options.timeout || '30000', 10),
      });

      logger.info(formatReplayResult(result));

      finish({
        checkpoint: 'mirror_replay',
        ok: result.replay.status === 'success',
        status: result.replay.status === 'success' ? 'passed' : 'failed',
        context_summary: `Replay #${seq}: similaridade ${(result.diff.similarityScore * 100).toFixed(0)}%`,
        data: {
          seq,
          similarityScore: result.diff.similarityScore,
          identical: result.diff.identical,
          replayLatencyMs: result.replay.latencyMs,
        },
      });
    });

  cmd
    .command('verify')
    .description('Verifica integridade da cadeia criptografica do ledger')
    .action(() => {
      const result = verifyChain(ROOT);
      if (result.valid) {
        printResult(`Ledger valido: ${result.totalEntries} entries encadeados`, true);
      } else {
        printResult(`Ledger quebrado no entry #${result.brokenAt}`, false);
      }
    });

  cmd
    .command('export')
    .description('Exporta entries como JSON')
    .option('--output <file>', 'Arquivo de saida')
    .option('--limit <n>', 'Limite de entries', '1000')
    .action((options: Record<string, string>) => {
      const entries = queryEntries(ROOT, { limit: parseInt(options.limit || '1000', 10) });
      const json = JSON.stringify(entries, null, 2);
      if (options.output) {
        getIO().fs.write(path.resolve(options.output), json);
        printResult(`Exportado ${entries.length} entries`, true, options.output);
      } else {
        logger.info(json);
      }
    });

  return cmd;
}
