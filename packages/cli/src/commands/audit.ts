import { Command } from "commander";
import { createLogger } from '@ideia/logger';
const logger = createLogger('commands.audit');
import path from "node:path";
import { AuditTrail } from "@ideia/audit-trail";
import { PendenciaStore } from "@ideia/audit-trail";

export type AuditFinding = {
  id: string;
  severity: "low" | "medium" | "high" | "critical";
  category: "security" | "architecture" | "quality" | "documentation" | "ux" | "communication";
  title: string;
  description: string;
  recommendation: string;
};

const _AUDIT_DIR = path.join(process.cwd(), ".ai", "audit");

function auditTrailHealth(auditTrail: AuditTrail): AuditFinding[] {
  const findings: AuditFinding[] = [];
  const chain = auditTrail.verifyChain();
  if (!chain.valid) {
    findings.push({
      id: "AUDIT-CHAIN-BROKEN",
      severity: "critical",
      category: "security",
      title: "Audit trail SHA-256 chain integrity violation",
      description: `Chain broken at event ${chain.breakAtIndex}: ${chain.breakReason}`,
      recommendation: "Investigate tampering. Restore from backup or reinitialize audit trail.",
    });
  }
  const count = auditTrail.count();
  if (count === 0) {
    findings.push({
      id: "AUDIT-TRAIL-EMPTY",
      severity: "medium",
      category: "quality",
      title: "Audit trail is empty",
      description: "No audit events recorded. CLI commands are not being traced.",
      recommendation: "Verify AuditTrail is connected to CLI lifecycle hooks.",
    });
  }
  return findings;
}

function pendenciaStoreHealth(store: PendenciaStore): AuditFinding[] {
  const findings: AuditFinding[] = [];
  const stats = store.count();
  if (stats.open > 0) {
    const bySev = Object.entries(stats.bySeverity)
      .map(([s, c]) => `${s}: ${c}`).join(', ');
    findings.push({
      id: "AUDIT-PENDENCIAS-OPEN",
      severity: stats.bySeverity.critical ? "critical" : stats.bySeverity.high ? "high" : "medium",
      category: "quality",
      title: `Open audit pendencias: ${stats.open}`,
      description: `There are ${stats.open} unresolved audit items (${bySev}).`,
      recommendation: "Review and resolve open pendencias. Use audit-ledger for chain verification.",
    });
  }
  return findings;
}

export function runAudit(deps?: { cwd?: string }): { findings: AuditFinding[]; allChecksPassed: boolean } {
  const cwd = deps?.cwd || process.cwd();
  const trailPath = path.join(cwd, ".ai", "audit", "cli-trail.jsonl");
  const pendPath = path.join(cwd, ".ai", "audit", "pendencias.jsonl");
  const auditTrail = new AuditTrail(trailPath);
  const pendStore = new PendenciaStore(pendPath);

  const findings: AuditFinding[] = [
    ...auditTrailHealth(auditTrail),
    ...pendenciaStoreHealth(pendStore),
  ];

  const allChecksPassed = findings.filter(f => f.severity === 'critical' || f.severity === 'high').length === 0;
  return { findings, allChecksPassed };
}

export function auditCommand(): Command {
  return new Command("audit")
    .description("Auditoria de seguranca, arquitetura, qualidade, documentacao, comunicacao e UX")
    .option("--json", "Emitir JSON")
    .option("--dry-run", "Nao criar relatorio")
    .action((options) => {
      const { findings, allChecksPassed } = runAudit();
      const hasCriticalFindings = findings.some((finding) => ["high", "critical"].includes(finding.severity));
      const ok = !hasCriticalFindings && allChecksPassed;

      if (options.json) {
        console.log(JSON.stringify({ ok, findings, deepChecksPassed: allChecksPassed }, null, 2));
        process.exit(ok ? 0 : 1);
      }

      logger.info('\nIDEIA Audit\n');

      if (findings.length === 0) {
        logger.info('Nenhum problema encontrado.');
        return;
      }

      for (const finding of findings) {
        const icons: Record<string, string> = { critical: "🔴", high: "🟠", medium: "🟡", low: "🔵" };
        logger.info('${icons[finding.severity] || "⚪"} [${finding.severity}] ${finding.title}');
        logger.info('   Categoria: ${finding.category}');
        logger.info('   ${finding.description}');
        logger.info('   Recomendacao: ${finding.recommendation}\n');
      }

      if (!options.dryRun) {
        const reportDir = path.join(process.cwd(), ".ai/reports");
        const fs = require("node:fs");
        fs.mkdirSync(reportDir, { recursive: true });
        const report = `# Audit Report — ${new Date().toISOString()}\n\n${findings.map((f) => `## ${f.id} — ${f.title}\n\n- Severidade: ${f.severity}\n- Categoria: ${f.category}\n\n### Descricao\n\n${f.description}\n\n### Recomendacao\n\n${f.recommendation}\n`).join("\n")}\n`;
        fs.writeFileSync(path.join(reportDir, `audit-${new Date().toISOString().slice(0, 10)}.md`), report, "utf8");
      }

      process.exit(ok && allChecksPassed ? 0 : 1);
    });
}
