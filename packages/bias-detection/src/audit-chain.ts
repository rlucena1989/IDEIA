// ==========================================================================
// audit-chain.ts
// ==========================================================================

import * as crypto from "crypto";
import type { BiasReport } from "./types";

export interface AuditEntry {
  index: number;
  previousHash: string;
  currentHash: string;
  dataSnapshot: string;
  timestamp: string;
  action: string;
}

export class AuditChain {
  private chain: AuditEntry[] = [];
  private lastHash: string = crypto.createHash("sha256").update("GENESIS").digest("hex");

  addEntry(report: BiasReport): AuditEntry {
    const index = this.chain.length;
    const dataSnapshot = JSON.stringify({ id: report.id, status: report.overallStatus, compositeScore: report.compositeScore });
    const hashInput = this.lastHash + dataSnapshot + index;
    const currentHash = crypto.createHash("sha256").update(hashInput).digest("hex");
    const entry: AuditEntry = {
      index, previousHash: this.lastHash, currentHash,
      dataSnapshot, timestamp: new Date().toISOString(),
      action: "bias_report_" + report.overallStatus,
    };
    this.chain.push(entry);
    this.lastHash = currentHash;
    return entry;
  }

  verifyIntegrity(): boolean {
    if (this.chain.length === 0) return true;
    const genesis = crypto.createHash("sha256").update("GENESIS").digest("hex");
    if (this.chain[0].previousHash !== genesis) return false;
    for (let i = 1; i < this.chain.length; i++) {
      if (this.chain[i].previousHash !== this.chain[i - 1].currentHash) return false;
    }
    return true;
  }

  getChain(): AuditEntry[] { return [...this.chain]; }
  getLastHash(): string | undefined { return this.chain.length > 0 ? this.lastHash : undefined; }
}
