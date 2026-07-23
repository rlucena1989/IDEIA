import { Command } from 'commander';
import { DomainRegistry } from '../ecosystem/domain-registry';
import { createDomain, AuthorityAssignment } from '../ecosystem/ecosystem-types';
import { grantAuthority } from '../ecosystem/authority-broker';
import { createEnvelope } from '../hardening/output-contract';
import { printHeader, printLine, printResult } from '../utils/output';
import { getCliVersion } from '../utils/version';

const registry = new DomainRegistry();
const assignments: AuthorityAssignment[] = [];

export function authorityCommand(): Command {
  const cmd = new Command('authority')
    .description('Delegação de autoridade no ecossistema — Fase 25');

  cmd
    .command('grant')
    .description('Concede autoridade a um domínio')
    .argument('<domain-id>', 'ID do domínio')
    .option('--by <by>', 'Concedente', 'admin')
    .option('--reason <reason>', 'Motivo', 'Delegação de autoridade')
    .option('--json', 'Saída em JSON')
    .action((domainId: string, opts) => {
      try {
        const domain = registry.get(domainId);
        if (!domain) { console.error('Domínio não encontrado'); process.exit(1); }
        const assignment = grantAuthority(domain, opts.by, opts.reason);
        assignments.push(assignment);
        const envelope = createEnvelope({
          ok: true, command: 'authority grant', version: getCliVersion(), data: assignment,
        });

        if (opts.json) { printLine(JSON.stringify(envelope, null, 2)); return; }
        printResult('Autoridade concedida', true, `${domain.name} (${assignment.authorityLevel})`);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Erro ao conceder: ${message}`);
        process.exit(1);
      }
    });

  cmd
    .command('revoke')
    .description('Revoga autoridade de um domínio')
    .argument('<domain-id>', 'ID do domínio')
    .option('--json', 'Saída em JSON')
    .action((domainId: string, opts) => {
      try {
        const idx = assignments.findIndex(a => a.domainId === domainId);
        if (idx < 0) { console.error('Nenhuma autoridade encontrada para este domínio'); process.exit(1); }
        assignments.splice(idx, 1);
        const envelope = createEnvelope({
          ok: true, command: 'authority revoke', version: getCliVersion(),
          data: { domainId, revoked: true },
        });

        if (opts.json) { printLine(JSON.stringify(envelope, null, 2)); return; }
        printResult('Autoridade revogada', true, domainId);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Erro ao revogar: ${message}`);
        process.exit(1);
      }
    });

  cmd
    .command('list')
    .description('Lista delegações de autoridade')
    .option('--json', 'Saída em JSON')
    .action((opts) => {
      try {
        const envelope = createEnvelope({
          ok: true, command: 'authority list', version: getCliVersion(),
          data: { count: assignments.length, assignments },
        });

        if (opts.json) { printLine(JSON.stringify(envelope, null, 2)); return; }

        printHeader('Autoridades');
        for (const a of assignments) {
          printLine(`  ${a.domainId.substring(0, 12)}... → nível ${a.authorityLevel} (por ${a.grantedBy})`);
        }
        if (assignments.length === 0) printLine('  Nenhuma autoridade delegada.');
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Erro ao listar: ${message}`);
        process.exit(1);
      }
    });

  return cmd;
}
