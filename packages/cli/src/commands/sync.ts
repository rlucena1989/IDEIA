import { Command } from 'commander';
import { createPackageMetadata, OperationalPackage } from '../distribution/package-types';
import { buildOperationalPackage } from '../distribution/package-builder';
import { computePackageChecksum } from '../distribution/package-hasher';
import { synchronizePackage } from '../distribution/sync-manager';
import { reconcilePackages } from '../distribution/package-reconciler';
import { createEnvelope } from '../hardening/output-contract';
import { printHeader, printLine, printResult } from '../utils/output';
import { getCliVersion } from '../utils/version';

export function syncCommand(): Command {
  const cmd = new Command('sync')
    .description('Sincronização e reconciliação de pacotes — Fase 13');

  cmd
    .command('status')
    .description('Verifica status de sincronização entre pacotes local e remoto')
    .argument('<local-data>', 'Payload local em JSON string')
    .argument('<remote-data>', 'Payload remoto em JSON string')
    .option('--json', 'Saída em JSON')
    .action((localData: string, remoteData: string, opts) => {
      try {
        const localPayload = JSON.parse(localData);
        const remotePayload = JSON.parse(remoteData);
        const localMeta = createPackageMetadata({ source: 'local', target: 'remote', kind: 'state' });
        const remoteMeta = createPackageMetadata({ source: 'remote', target: 'local', kind: 'state' });
        const localPkg = buildOperationalPackage(localMeta, localPayload, computePackageChecksum(JSON.stringify(localPayload)));
        const remotePkg = buildOperationalPackage(remoteMeta, remotePayload, computePackageChecksum(JSON.stringify(remotePayload)));
        const result = reconcilePackages(localPkg, remotePkg);
        const envelope = createEnvelope({
          ok: result.ok, command: 'sync status', version: getCliVersion(), data: result,
        });

        if (opts.json) { printLine(JSON.stringify(envelope, null, 2)); return; }

        printHeader('Status de Sincronização');
        const icon = result.status === 'identical' ? '✅' : result.status === 'diverged' ? '⚠️' : '❌';
        printLine(`  ${icon} Status: ${result.status}`);
        for (const note of result.notes) printLine(`  → ${note}`);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Erro ao verificar status: ${message}`);
        process.exit(1);
      }
    });

  cmd
    .command('run')
    .description('Executa sincronização entre pacotes')
    .argument('<local-data>', 'Payload local em JSON string')
    .option('--target <target>', 'Destino da sincronização', 'remote')
    .option('--json', 'Saída em JSON')
    .action((localData: string, opts) => {
      try {
        const localPayload = JSON.parse(localData);
        const localMeta = createPackageMetadata({ source: 'local', target: opts.target, kind: 'state' });
        const localPkg = buildOperationalPackage(localMeta, localPayload, computePackageChecksum(JSON.stringify(localPayload)));
        const result = synchronizePackage(localPkg, undefined, opts.target);
        const envelope = createEnvelope({
          ok: result.ok, command: 'sync run', version: getCliVersion(), data: result,
        });

        if (opts.json) { printLine(JSON.stringify(envelope, null, 2)); return; }

        printHeader('Sincronização');
        printResult('Status', result.ok, `${result.syncType}`);
        for (const note of result.notes) printLine(`  → ${note}`);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Erro na sincronização: ${message}`);
        process.exit(1);
      }
    });

  cmd
    .command('reconcile')
    .description('Reconcilia divergências entre pacotes')
    .argument('<local-data>', 'Payload local em JSON string')
    .argument('<remote-data>', 'Payload remoto em JSON string')
    .option('--json', 'Saída em JSON')
    .action((localData: string, remoteData: string, opts) => {
      try {
        const localPayload = JSON.parse(localData);
        const remotePayload = JSON.parse(remoteData);
        const localMeta = createPackageMetadata({ source: 'local', target: 'remote', kind: 'state' });
        const remoteMeta = createPackageMetadata({ source: 'remote', target: 'local', kind: 'state' });
        const localPkg = buildOperationalPackage(localMeta, localPayload, computePackageChecksum(JSON.stringify(localPayload)));
        const remotePkg = buildOperationalPackage(remoteMeta, remotePayload, computePackageChecksum(JSON.stringify(remotePayload)));
        const reconciliation = reconcilePackages(localPkg, remotePkg);
        const envelope = createEnvelope({
          ok: reconciliation.ok, command: 'sync reconcile', version: getCliVersion(), data: reconciliation,
        });

        if (opts.json) { printLine(JSON.stringify(envelope, null, 2)); return; }

        printHeader('Reconciliação');
        const icon = reconciliation.status === 'identical' ? '✅' : '⚠️';
        printLine(`  ${icon} Status: ${reconciliation.status}`);
        for (const note of reconciliation.notes) printLine(`  → ${note}`);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Erro na reconciliação: ${message}`);
        process.exit(1);
      }
    });

  cmd
    .command('repair')
    .description('Força sincronização ignorando divergências')
    .argument('<local-data>', 'Payload local em JSON string')
    .option('--target <target>', 'Destino', 'remote')
    .option('--json', 'Saída em JSON')
    .action((localData: string, opts) => {
      try {
        const localPayload = JSON.parse(localData);
        const localMeta = createPackageMetadata({ source: 'local', target: opts.target, kind: 'state' });
        const localPkg = buildOperationalPackage(localMeta, localPayload, computePackageChecksum(JSON.stringify(localPayload)));
        const result = synchronizePackage(localPkg, undefined, opts.target);
        const envelope = createEnvelope({
          ok: true, command: 'sync repair', version: getCliVersion(),
          data: { ...result, note: 'Repair sync forced.' },
        });

        if (opts.json) { printLine(JSON.stringify(envelope, null, 2)); return; }

        printHeader('Reparo de Sincronização');
        printResult('Status', true, 'Forçado');
        printLine(`  Tipo: ${result.syncType}`);
        for (const note of result.notes) printLine(`  → ${note}`);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Erro no reparo: ${message}`);
        process.exit(1);
      }
    });

  return cmd;
}
