import { Command } from 'commander';
import { createApprovalRequest, approveAction, MultiLevelRequest } from '../governance/approval-flow';
import { createEnvelope } from '../hardening/output-contract';
import { printHeader, printLine, printResult } from '../utils/output';
import { getCliVersion } from '../utils/version';

const pendingRequests: MultiLevelRequest[] = [];

export function approveCommand(): Command {
  const cmd = new Command('approve')
    .description('Fluxo de aprovação operacional — Fase 16');

  cmd
    .command('request')
    .description('Solicita aprovação para uma ação')
    .argument('<action>', 'Ação a ser aprovada')
    .option('--reason <reason>', 'Motivo', 'Operação requer aprovação')
    .option('--by <by>', 'Solicitante', 'ai-devkit')
    .option('--json', 'Saída em JSON')
    .action((action: string, opts) => {
      try {
        const request = createApprovalRequest({ action, requestedBy: opts.by, reason: opts.reason });
        pendingRequests.push(request);
        const envelope = createEnvelope({
          ok: true, command: 'approve request', version: getCliVersion(), data: request,
        });

        if (opts.json) { printLine(JSON.stringify(envelope, null, 2)); return; }

        printHeader('Solicitação de Aprovação');
        printLine(`  ID: ${request.approvalId.substring(0, 12)}...`);
        printLine(`  Ação: ${request.action}`);
        printLine(`  Solicitante: ${request.requestedBy}`);
        printLine(`  Motivo: ${request.reason}`);
        printLine(`  Status: Pendente`);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Erro na solicitação: ${message}`);
        process.exit(1);
      }
    });

  cmd
    .command('grant')
    .description('Aprova uma solicitação pendente')
    .argument('<approvalId>', 'ID da solicitação')
    .option('--by <by>', 'Aprovador', 'admin')
    .option('--json', 'Saída em JSON')
    .action((approvalId: string, opts) => {
      try {
        const req = pendingRequests.find(r => r.approvalId === approvalId);
        if (!req) { console.error(`Solicitação não encontrada: ${approvalId}`); process.exit(1); }
        const result = approveAction(req, true, opts.by);
        const idx = pendingRequests.indexOf(req);
        pendingRequests.splice(idx, 1);
        const envelope = createEnvelope({
          ok: true, command: 'approve grant', version: getCliVersion(), data: result,
        });

        if (opts.json) { printLine(JSON.stringify(envelope, null, 2)); return; }

        printResult('Aprovado', true, `${req.action} por ${opts.by}`);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Erro na aprovação: ${message}`);
        process.exit(1);
      }
    });

  cmd
    .command('deny')
    .description('Rejeita uma solicitação pendente')
    .argument('<approvalId>', 'ID da solicitação')
    .option('--by <by>', 'Aprovador', 'admin')
    .option('--json', 'Saída em JSON')
    .action((approvalId: string, opts) => {
      try {
        const req = pendingRequests.find(r => r.approvalId === approvalId);
        if (!req) { console.error(`Solicitação não encontrada: ${approvalId}`); process.exit(1); }
        const result = approveAction(req, false, opts.by);
        const idx = pendingRequests.indexOf(req);
        pendingRequests.splice(idx, 1);
        const envelope = createEnvelope({
          ok: false, command: 'approve deny', version: getCliVersion(), data: result,
        });

        if (opts.json) { printLine(JSON.stringify(envelope, null, 2)); return; }

        printResult('Rejeitado', false, `${req.action} por ${opts.by}`);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Erro na rejeição: ${message}`);
        process.exit(1);
      }
    });

  return cmd;
}
