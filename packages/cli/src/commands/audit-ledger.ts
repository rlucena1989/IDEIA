import { Command } from "commander";
import path from "path";
import { AuditTrail } from "@ideia/audit-trail";

export function auditLedgerAction(): void {
  const trailPath = path.join(process.cwd(), ".ai", "audit", "cli-trail.jsonl");
  const auditTrail = new AuditTrail(trailPath);
  console.log('\nVerifying integridade do Audit Trail (SHA-256 chain)...\n');
  const result = auditTrail.verifyChain();
  if (result.valid) {
    console.log(`Ledger confiavel. Total de eventos: ${result.totalEvents}`);
    console.log(`Tip hash: ${result.currentTipHash?.slice(0, 16)}...\n`);
    process.exit(0);
  } else {
    console.error(`ALERTA: adulteracao detectada no evento ${result.breakAtIndex}`);
    console.error(`Motivo: ${result.breakReason}`);
    process.exit(1);
  }
}

export function auditLedgerCommand(): Command {
    return new Command("audit-ledger")
        .description("Verifica integridade do Audit Trail (SHA-256 chain)")
        .action(auditLedgerAction);
}
