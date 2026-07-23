import { Command } from 'commander';
import { printLine, printResult } from "../utils/output";
import { createAttestation, loadChain, validateChain, revokeAttestation, Attestation } from '../attestations/chain';

const ROOT = process.cwd();

export function attestVerifyAction(checkType: string, options: { result?: string; details?: string }): void {
  const result = (options.result || 'pass') as 'pass' | 'fail' | 'warn';
  const att = createAttestation(ROOT, checkType, result, options.details);
  printLine(`Atestacao gerada:`);
  printLine(`  ID: ${att.id}`);
  printLine(`  Tipo: ${att.check_type}`);
  printLine(`  Resultado: ${att.result}`);
  printLine(`  Timestamp: ${att.timestamp}`);
  printLine(`  Assinatura: ${att.signature.slice(0, 16)}...`);
  printLine(`  Previous: ${att.prev_signature.slice(0, 16)}...`);
  printResult(`Atestacao registrada em .ai/attestations/chain.jsonl`, true);
}

export function attestValidateAction(): void {
  const { valid, errors, attestations } = validateChain(ROOT);
  if (attestations === 0) {
    printLine('Nenhuma atestacao encontrada.');
    return;
  }

  printLine(`Atestacoes na corrente: ${attestations}`);
  if (valid) {
    printResult('Corrente de atestacoes VALIDA — nenhuma adulteracao detectada.', true);
  } else {
    for (const err of errors) {
      printResult(err, false);
    }
  }
}

export function attestExportAction(): void {
  const chain = loadChain(ROOT);
  if (chain.length === 0) {
    printLine('Nenhuma atestacao para exportar.');
    return;
  }
  console.log(JSON.stringify(chain, null, 2));
}

export function attestChainAction(): void {
  const chain = loadChain(ROOT);
  if (chain.length === 0) {
    printLine('Nenhuma atestacao encontrada.');
    return;
  }

  printLine(`Corrente de atestacoes (${chain.length} elos):\n`);
  for (let i = 0; i < chain.length; i++) {
    const a = chain[i];
    const status = a.revoked ? '[REVOGADA]' : '[ATIVA]';
    const rev = a.revoked ? ` — ${a.revoke_reason || 'sem motivo'}` : '';
    printLine(`  ${i + 1}. ${status} ${a.check_type} — ${a.result}`);
    printLine(`     ID: ${a.id}`);
    printLine(`     Data: ${a.timestamp}`);
    printLine(`     Assinatura: ${a.signature.slice(0, 16)}...${rev}`);
    printLine('');
  }
}

export function attestRevokeAction(id: string, options: { reason?: string }): void {
  const ok = revokeAttestation(ROOT, id, options.reason);
  if (ok) {
    printResult(`Atestacao ${id} revogada.`, true);
  } else {
    printResult(`Atestacao ${id} nao encontrada.`, false);
  }
}

/**
 * Processa command.
 * @returns O resultado da operação.
 */
export function attestCommand(): Command {
  const cmd = new Command('attest')
    .description('Gere e gerencia atestacoes criptograficas');

  cmd
    .command('verify')
    .description('Gera atestacao assinada apos verificacao')
    .argument('<check-type>', 'Tipo de verificacao (ex: quality-gate, audit, compliance)')
    .option('--result <result>', 'Resultado: pass, fail, warn')
    .option('--details <details>', 'Detalhes adicionais')
    .action(attestVerifyAction);

  cmd
    .command('validate')
    .description('Valida integridade da corrente de atestacoes')
    .action(attestValidateAction);

  cmd
    .command('export')
    .description('Exporta atestacoes em formato JSON portavel')
    .action(attestExportAction);

  cmd
    .command('chain')
    .description('Exibe corrente de atestacoes')
    .action(attestChainAction);

  cmd
    .command('revoke')
    .description('Revoga uma atestacao (nao remove)')
    .argument('<id>', 'ID da atestacao')
    .option('--reason <reason>', 'Motivo da revogacao')
    .action(attestRevokeAction);

  return cmd;
}
