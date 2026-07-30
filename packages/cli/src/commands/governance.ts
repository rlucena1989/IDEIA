import { Command } from 'commander';
import { createLogger } from '@ideia/logger';
import { PolicyRegistry } from '../governance/policy-registry';
import { evaluatePermission } from '../governance/permission-engine';
import { DEFAULT_GOVERNANCE_POLICY } from '../governance/governance-policy';
import { buildGovernanceAudit, GovernanceAuditEntry } from '../governance/governance-audit';
import { buildGovernanceReport } from '../governance/governance-report';
import { buildGovernanceContext } from '../governance/governance-context';
import { decideGovernance } from '../ecosystem/governance-council';
import { auditEcosystem } from '../ecosystem/federation-auditor';
import { createEnvelope } from '../hardening/output-contract';
import { printHeader, printLine, printResult } from '../utils/output';
import { getCliVersion } from '../utils/version';

const registry = new PolicyRegistry();
registry.register(DEFAULT_GOVERNANCE_POLICY);
const auditTrail: GovernanceAuditEntry[] = [];

export function governanceCommand(): Command {
  const cmd = new Command('governance')
    .description('Governança, permissão e controle — Fase 16');

  cmd
    .command('check')
    .description('Verifica permissão para uma ação')
    .argument('<action>', 'Ação a verificar')
    .option('--context <context>', 'Contexto', 'default')
    .option('--risk <risk>', 'Risco', 'medium')
    .option('--json', 'Saída em JSON')
    .action((action: string, opts) => {
      try {
        const result = evaluatePermission(
          { action, contextId: opts.context, risk: opts.risk },
          registry.list()
        );
        const audit = buildGovernanceAudit({
          policyId: result.policyId, action, contextId: opts.context,
          allowed: result.allowed, requiresApproval: result.requiresApproval,
          decidedAt: new Date().toISOString(), reason: result.reason,
        });
        auditTrail.push(audit);
        const envelope = createEnvelope({
          ok: result.allowed, command: 'governance check', version: getCliVersion(),
          data: { permission: result, audit },
        });

        if (opts.json) { printLine(JSON.stringify(envelope, null, 2)); return; }

        printHeader('Verificação de Governança');
        printResult('Permitido', result.allowed, result.reason);
        printLine(`  Requer aprovação: ${result.requiresApproval ? 'Sim' : 'Não'}`);
        if (result.policyId) printLine(`  Política: ${result.policyId}`);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Erro na verificação: ${message}`);
        process.exit(1);
      }
    });

  cmd
    .command('audit')
    .description('Exibe trilha de auditoria de governança')
    .option('--json', 'Saída em JSON')
    .action((opts) => {
      try {
        const envelope = createEnvelope({
          ok: true, command: 'governance audit', version: getCliVersion(),
          data: { count: auditTrail.length, entries: auditTrail },
        });

        if (opts.json) { printLine(JSON.stringify(envelope, null, 2)); return; }

        printHeader('Auditoria de Governança');
        printLine(`  Total: ${auditTrail.length}`);
        for (const entry of auditTrail.slice(-10)) {
          const icon = entry.allowed ? '✅' : '❌';
          printLine(`  ${icon} ${entry.action} — ${entry.reason}`);
          printLine(`     Política: ${entry.policyId ?? 'N/A'}`);
        }
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Erro na auditoria: ${message}`);
        process.exit(1);
      }
    });

  cmd
    .command('report')
    .description('Relatório completo de governança')
    .option('--json', 'Saída em JSON')
    .action((opts) => {
      try {
        const context = buildGovernanceContext({ contextId: 'default', risk: 'medium' });
        const report = buildGovernanceReport({
          policies: registry.list(), audits: auditTrail, context,
        });
        const envelope = createEnvelope({
          ok: true, command: 'governance report', version: getCliVersion(), data: report,
        });

        if (opts.json) { printLine(JSON.stringify(envelope, null, 2)); return; }

        printHeader('Relatório de Governança');
        for (const s of report.summary) printLine(`  ℹ ${s}`);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Erro no relatório: ${message}`);
        process.exit(1);
      }
    });

  // Fase 25 — Governança global do ecossistema
  cmd
    .command('vote')
    .description('Simula votação de governança entre membros')
    .argument('<topic>', 'Tópico da votação')
    .option('--approvals <n>', 'Aprovações', '3')
    .option('--total <n>', 'Total de votos', '5')
    .option('--json', 'Saída em JSON')
    .action((topic: string, opts) => {
      try {
        const approvals = parseInt(opts.approvals, 10);
        const total = parseInt(opts.total, 10);
        const votes = Array.from({ length: total }, (_, i) => ({
          member: `member-${i + 1}`,
          approve: i < approvals,
        }));
        const decision = decideGovernance(topic, votes);
        auditEcosystem('governance', `vote:${topic}`, decision.approved ? 'approved' : 'rejected');
        const envelope = createEnvelope({
          ok: decision.approved, command: 'governance vote', version: getCliVersion(), data: decision,
        });

        if (opts.json) { printLine(JSON.stringify(envelope, null, 2)); return; }

        printHeader('Votação de Governança');
        printLine(`  Tópico: ${decision.topic}`);
        printLine(`  Votos: ${approvals}/${total} a favor`);
        printResult('Decisão', decision.approved, decision.reason);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Erro na votação: ${message}`);
        process.exit(1);
      }
    });

  cmd
    .command('decide')
    .description('Toma decisão global de governança')
    .argument('<topic>', 'Tópico')
    .option('--approve', 'Aprovar', true)
    .option('--reason <reason>', 'Motivo', 'Decisão administrativa')
    .option('--json', 'Saída em JSON')
    .action((topic: string, opts) => {
      try {
        const decision = { decisionId: `decision-${Date.now()}`, topic, approved: opts.approve, reason: opts.reason, decidedAt: new Date().toISOString() };
        auditEcosystem('governance', `decide:${topic}`, decision.approved ? 'approved' : 'rejected');
        const envelope = createEnvelope({
          ok: decision.approved, command: 'governance decide', version: getCliVersion(), data: decision,
        });

        if (opts.json) { printLine(JSON.stringify(envelope, null, 2)); return; }

        printHeader('Decisão Global');
        printResult('Aprovado', decision.approved, decision.reason);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Erro na decisão: ${message}`);
        process.exit(1);
      }
    });

  cmd
    .command('review')
    .description('Revisa decisões recentes')
    .option('--json', 'Saída em JSON')
    .action((opts) => {
      try {
        const decisions = [
          { topic: 'Autoevolução', approved: true },
          { topic: 'Federação cruzada', approved: true },
          { topic: 'Redução de autonomia', approved: false },
        ];
        const envelope = createEnvelope({
          ok: true, command: 'governance review', version: getCliVersion(), data: { decisions },
        });

        if (opts.json) { printLine(JSON.stringify(envelope, null, 2)); return; }

        printHeader('Revisão de Governança');
        for (const d of decisions) {
          printLine(`  ${d.approved ? '✅' : '❌'} ${d.topic}`);
        }
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Erro na revisão: ${message}`);
        process.exit(1);
      }
    });

  return cmd;
}
