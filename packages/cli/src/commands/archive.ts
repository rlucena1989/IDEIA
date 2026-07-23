import { Command } from 'commander';
import { archiveItems, verifyArchive } from '../legacy/archive-manager';
import { ArchiveBundle } from '../legacy/legacy-types';
import { createEnvelope } from '../hardening/output-contract';
import { printHeader, printLine } from '../utils/output';
import { getCliVersion } from '../utils/version';

const bundles: ArchiveBundle[] = [];

export function archiveCommand(): Command {
  const cmd = new Command('archive')
    .description('Arquivamento de artefatos do sistema — Fase 30');

  cmd
    .command('create')
    .description('Cria um pacote de arquivamento')
    .argument('<items>', 'Itens para arquivar (separados por vírgula)')
    .option('--json', 'Saída em JSON')
    .action((itemsStr: string, opts) => {
      try {
        const items = itemsStr.split(',').map((s: string) => s.trim());
        const bundle = archiveItems(items);
        bundles.push(bundle);

        const envelope = createEnvelope({
          ok: true, command: 'archive create', version: getCliVersion(), data: bundle,
        });

        if (opts.json) { printLine(JSON.stringify(envelope, null, 2)); return; }

        printHeader('Arquivo Criado');
        printLine(`  Bundle ID: ${bundle.bundleId}`);
        printLine(`  Itens: ${bundle.items.length}`);
        for (const item of bundle.items) {
          printLine(`    → ${item}`);
        }
        printLine(`  Checksum: ${bundle.checksum}`);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Erro ao arquivar: ${message}`);
        process.exit(1);
      }
    });

  cmd
    .command('list')
    .description('Lista pacotes de arquivamento')
    .option('--json', 'Saída em JSON')
    .action((opts) => {
      try {
        const envelope = createEnvelope({
          ok: true, command: 'archive list', version: getCliVersion(),
          data: { count: bundles.length, bundles },
        });

        if (opts.json) { printLine(JSON.stringify(envelope, null, 2)); return; }

        printHeader('Pacotes de Arquivo');
        printLine(`  Total: ${bundles.length}`);
        for (const b of bundles.slice(-10)) {
          printLine(`  ${b.bundleId} — ${b.items.length} item(s), checksum: ${b.checksum}`);
        }
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Erro ao listar: ${message}`);
        process.exit(1);
      }
    });

  cmd
    .command('verify')
    .description('Verifica integridade de um pacote')
    .argument('<bundle-id>', 'ID do pacote')
    .option('--json', 'Saída em JSON')
    .action((bundleId: string, opts) => {
      try {
        const bundle = bundles.find(b => b.bundleId === bundleId);
        if (!bundle) { console.error(`Pacote não encontrado: ${bundleId}`); process.exit(1); }

        const valid = verifyArchive(bundle);

        const envelope = createEnvelope({
          ok: valid, command: 'archive verify', version: getCliVersion(),
          data: { bundleId, valid, checksum: bundle.checksum },
        });

        if (opts.json) { printLine(JSON.stringify(envelope, null, 2)); return; }

        printHeader('Verificação de Arquivo');
        printLine(`  Bundle: ${bundleId}`);
        printLine(`  Integridade: ${valid ? '✅ OK' : '❌ FALHA'}`);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Erro na verificação: ${message}`);
        process.exit(1);
      }
    });

  return cmd;
}
