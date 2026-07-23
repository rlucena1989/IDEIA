import { Command } from 'commander';
import { DomainRegistry } from '../ecosystem/domain-registry';
import { createDomain } from '../ecosystem/ecosystem-types';
import { canCrossTrustBoundary } from '../ecosystem/trust-boundary';
import { createEnvelope } from '../hardening/output-contract';
import { printHeader, printLine, printResult } from '../utils/output';
import { getCliVersion } from '../utils/version';

const registry = new DomainRegistry();
registry.upsert(createDomain({ name: 'internal', type: 'organization', scope: ['state', 'secret'], trustLevel: 'critical', status: 'healthy' }));
registry.upsert(createDomain({ name: 'external', type: 'partner', scope: ['state'], trustLevel: 'low', status: 'healthy' }));

export function trustCommand(): Command {
  const cmd = new Command('trust')
    .description('Limites de confiança entre domínios — Fase 25');

  cmd
    .command('check')
    .description('Verifica se payload pode cruzar fronteira de confiança')
    .argument('<from-id>', 'Domínio origem')
    .argument('<to-id>', 'Domínio destino')
    .argument('<payload-type>', 'Tipo do payload (state, secret, policy)')
    .option('--json', 'Saída em JSON')
    .action((fromId: string, toId: string, payloadType: string, opts) => {
      try {
        const from = registry.get(fromId);
        const to = registry.get(toId);
        if (!from || !to) { console.error('Domínio não encontrado'); process.exit(1); }
        const allowed = canCrossTrustBoundary(from, to, payloadType);
        const envelope = createEnvelope({
          ok: allowed, command: 'trust check', version: getCliVersion(),
          data: { from: from.name, to: to.name, payloadType, allowed },
        });

        if (opts.json) { printLine(JSON.stringify(envelope, null, 2)); return; }
        printResult('Permitido', allowed, `${payloadType}: ${from.name} → ${to.name}`);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Erro no check: ${message}`);
        process.exit(1);
      }
    });

  cmd
    .command('boundary')
    .description('Lista regras de fronteira e verifica um par')
    .argument('<from-id>', 'Domínio origem')
    .argument('<to-id>', 'Domínio destino')
    .option('--json', 'Saída em JSON')
    .action((fromId: string, toId: string, opts) => {
      try {
        const from = registry.get(fromId);
        const to = registry.get(toId);
        if (!from || !to) { console.error('Domínio não encontrado'); process.exit(1); }
        const results = {
          state: canCrossTrustBoundary(from, to, 'state'),
          secret: canCrossTrustBoundary(from, to, 'secret'),
          policy: canCrossTrustBoundary(from, to, 'policy'),
        };
        const envelope = createEnvelope({
          ok: true, command: 'trust boundary', version: getCliVersion(), data: results,
        });

        if (opts.json) { printLine(JSON.stringify(envelope, null, 2)); return; }

        printHeader('Fronteira de Confiança');
        printLine(`  ${from.name} → ${to.name}:`);
        for (const [type, allowed] of Object.entries(results)) {
          printLine(`  ${allowed ? '✅' : '❌'} ${type}`);
        }
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Erro na fronteira: ${message}`);
        process.exit(1);
      }
    });

  return cmd;
}
