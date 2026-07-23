import { Command } from 'commander';
import { PolicyRegistry } from '../governance/policy-registry';
import { DEFAULT_GOVERNANCE_POLICY } from '../governance/governance-policy';
import { GovernancePolicy } from '../governance/policy-types';
import { createEnvelope } from '../hardening/output-contract';
import { printHeader, printLine, printResult } from '../utils/output';
import { getCliVersion } from '../utils/version';

const registry = new PolicyRegistry();
registry.register(DEFAULT_GOVERNANCE_POLICY);

export function policyCommand(): Command {
  const cmd = new Command('policy')
    .description('Políticas de governança operacional — Fase 16');

  cmd
    .command('list')
    .description('Lista políticas registradas')
    .option('--json', 'Saída em JSON')
    .action((opts) => {
      try {
        const policies = registry.list();
        const envelope = createEnvelope({
          ok: true, command: 'policy list', version: getCliVersion(),
          data: { count: policies.length, policies },
        });

        if (opts.json) { printLine(JSON.stringify(envelope, null, 2)); return; }

        printHeader('Políticas');
        printLine(`  Total: ${policies.length}`);
        for (const p of policies) {
          printLine(`  ${p.enabled ? '✅' : '❌'} ${p.name} (${p.policyId.substring(0, 12)}...)`);
          printLine(`     Regras: ${p.rules.length} | Aplica-se a: ${p.appliesTo.join(', ')}`);
        }
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Erro ao listar: ${message}`);
        process.exit(1);
      }
    });

  cmd
    .command('show <policyId>')
    .description('Exibe detalhes de uma política')
    .option('--json', 'Saída em JSON')
    .action((policyId: string, opts) => {
      try {
        const policy = registry.get(policyId);
        if (!policy) { console.error(`Política não encontrada: ${policyId}`); process.exit(1); }
        const envelope = createEnvelope({
          ok: true, command: 'policy show', version: getCliVersion(), data: policy,
        });

        if (opts.json) { printLine(JSON.stringify(envelope, null, 2)); return; }

        printHeader(`Política: ${policy.name}`);
        printLine(`  ID: ${policy.policyId}`);
        printLine(`  Ativa: ${policy.enabled ? 'Sim' : 'Não'}`);
        printLine(`  Regras:`);
        for (const rule of policy.rules) {
          printLine(`  ${rule.allow ? '✅' : '❌'} ${rule.action} (aprovação: ${rule.requiresApproval ? 'Sim' : 'Não'})`);
          printLine(`     Risco mínimo: ${rule.minRisk ?? 'N/A'}`);
        }
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Erro ao exibir: ${message}`);
        process.exit(1);
      }
    });

  return cmd;
}
