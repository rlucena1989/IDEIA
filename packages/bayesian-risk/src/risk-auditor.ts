import { createHash, randomUUID } from 'crypto'
import { createLogger } from '@ideia/logger';
import { PolicyRiskResponse, PolicyRiskRequest, RiskAuditEntry } from './types'
const logger = createLogger('risk-auditor');

export class RiskAuditor {
  private _chain: RiskAuditEntry[] = []
  private _previousHash: string = '0'

  record(result: PolicyRiskResponse, request: PolicyRiskRequest): RiskAuditEntry {
    const entry: RiskAuditEntry = {
      timestamp: new Date().toISOString(),
      policyId: request.policyId ?? request.requestId ?? randomUUID(),
      userId: request.agentId ?? 'system',
      action: request.action ?? 'read',
      riskScore: result.riskScore ?? 0,
      decision: result.decision,
      previousHash: this._previousHash,
      hash: '',
    }
    entry.hash = createHash('sha256')
      .update(
        `${entry.timestamp}|${entry.riskScore}|${entry.decision}|${entry.previousHash}`
      )
      .digest('hex')
    this._previousHash = entry.hash
    this._chain.push(entry)
    return entry
  }

  verifyChain(): boolean {
    for (let i = 1; i < this._chain.length; i++) {
      if (this._chain[i].previousHash !== this._chain[i - 1].hash) return false
    }
    return true
  }

  getChain(): RiskAuditEntry[] {
    return this._chain
  }
}
