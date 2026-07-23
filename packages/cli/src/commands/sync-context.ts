import { Command } from 'commander';
import { FederationRegistry } from '../federation/federation-registry';
import { createSyncRequest, SyncDecision } from '../federation/federation-types';
import { routeSync } from '../federation/federation-router';
import { arbitrateSync } from '../federation/sync-arbitrator';
import { resolveConflict, ConflictResolution } from '../federation/conflict-resolver';
import { createEnvelope } from '../hardening/output-contract';
import { printHeader, printLine, printResult } from '../utils/output';
import { getCliVersion } from '../utils/version';

const registry = new FederationRegistry();
const decisions: SyncDecision[] = [];
const resolutions: ConflictResolution[] = [];

export function syncContextCommand(): Command {
  const cmd = new Command('sync-context')
    .description('Sincronização entre contextos federados — Fase 22');

  cmd
    .command('route')
    .description('Roteia uma requisição de sync para o melhor nó')
    .argument('<payload-type>', 'Tipo do payload')
    .option('--from <nodeId>', 'Nó origem', 'local')
    .option('--json', 'Saída em JSON')
    .action((payloadType: string, opts) => {
      try {
        const fromNode = registry.get(opts.from);
        if (!fromNode) { console.error('Nó origem não encontrado'); process.exit(1); }
        const request = createSyncRequest({ fromNodeId: fromNode.nodeId, toNodeId: '', payloadType });
        const target = routeSync(registry.list(), request);
        const envelope = createEnvelope({
          ok: !!target, command: 'sync-context route', version: getCliVersion(),
          data: { request, target },
        });

        if (opts.json) { printLine(JSON.stringify(envelope, null, 2)); return; }

        if (target) {
          printLine(`Rota: ${request.payloadType} → ${target.name} (${target.authorityLevel})`);
        } else {
          printLine('Nenhum nó disponível para rotear.');
        }
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Erro no roteamento: ${message}`);
        process.exit(1);
      }
    });

  cmd
    .command('arbitrate')
    .description('Arbitra conflito de versão entre dois nós')
    .argument('<local-version>', 'Versão local')
    .argument('<remote-version>', 'Versão remota')
    .option('--local-auth <n>', 'Autoridade local', '2')
    .option('--remote-auth <n>', 'Autoridade remota', '1')
    .option('--json', 'Saída em JSON')
    .action((localVer: string, remoteVer: string, opts) => {
      try {
        const decision = arbitrateSync(localVer, remoteVer, parseInt(opts.localAuth, 10), parseInt(opts.remoteAuth, 10));
        decisions.push(decision);
        const envelope = createEnvelope({
          ok: decision.approved, command: 'sync-context arbitrate', version: getCliVersion(), data: decision,
        });

        if (opts.json) { printLine(JSON.stringify(envelope, null, 2)); return; }

        printHeader('Arbitragem de Sync');
        printResult('Aprovado', decision.approved);
        printLine(`  Vencedor: ${decision.winnerNodeId ?? 'Nenhum'}`);
        printLine(`  Motivo: ${decision.reason}`);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Erro na arbitragem: ${message}`);
        process.exit(1);
      }
    });

  cmd
    .command('apply')
    .description('Aplica resolução de conflito entre contextos')
    .argument('<conflict-type>', 'Tipo do conflito')
    .option('--severity <severity>', 'Severidade', 'medium')
    .option('--json', 'Saída em JSON')
    .action((conflictType: string, opts) => {
      try {
        const resolution = resolveConflict(conflictType, opts.severity);
        resolutions.push(resolution);
        const envelope = createEnvelope({
          ok: resolution.resolved, command: 'sync-context apply', version: getCliVersion(), data: resolution,
        });

        if (opts.json) { printLine(JSON.stringify(envelope, null, 2)); return; }

        printHeader('Resolução de Conflito');
        printResult('Resolvido', resolution.resolved);
        printLine(`  Ação: ${resolution.action}`);
        printLine(`  Motivo: ${resolution.reason}`);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Erro na resolução: ${message}`);
        process.exit(1);
      }
    });

  return cmd;
}
