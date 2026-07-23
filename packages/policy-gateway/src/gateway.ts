import { Decision, RiskLevel } from '@ideia/contracts';
import { evaluatePolicy, evaluateBatch, PolicyInput, PolicyResult } from '@ideia/policy-engine';

export interface GatewayRequest {
  actionType: string;
  resource?: string;
  riskLevel?: RiskLevel;
  actor?: string;
  sessionId?: string;
}

export interface GatewayAuditEntry {
  timestamp: string;
  actor: string;
  actionType: string;
  resource?: string;
  decision: Decision;
  reason: string;
  sessionId?: string;
}

export interface GatewayResponse {
  allowed: boolean;
  requiresApproval: boolean;
  decision: Decision;
  reason: string;
}

export function processRequest(req: GatewayRequest): GatewayResponse {
  const policyInput: PolicyInput = {
    actionType: req.actionType,
    resource: req.resource,
    riskLevel: req.riskLevel,
  };

  const result: PolicyResult = evaluatePolicy(policyInput);

  return {
    allowed: result.decision === 'auto',
    requiresApproval: result.decision === 'ask',
    decision: result.decision,
    reason: result.reason,
  };
}

export function processBatch(requests: GatewayRequest[]): GatewayResponse[] {
  const inputs: PolicyInput[] = requests.map(r => ({
    actionType: r.actionType,
    resource: r.resource,
    riskLevel: r.riskLevel,
  }));

  const results: PolicyResult[] = evaluateBatch(inputs);

  return results.map(r => ({
    allowed: r.decision === 'auto',
    requiresApproval: r.decision === 'ask',
    decision: r.decision,
    reason: r.reason,
  }));
}

export function createAuditEntry(req: GatewayRequest, response: GatewayResponse): GatewayAuditEntry {
  return {
    timestamp: new Date().toISOString(),
    actor: req.actor || 'unknown',
    actionType: req.actionType,
    resource: req.resource,
    decision: response.decision,
    reason: response.reason,
    sessionId: req.sessionId,
  };
}

export class PolicyGateway {
  private auditLog: GatewayAuditEntry[] = [];

  evaluate(req: GatewayRequest): GatewayResponse {
    const response = processRequest(req);
    this.auditLog.push(createAuditEntry(req, response));
    return response;
  }

  evaluateBatch(requests: GatewayRequest[]): GatewayResponse[] {
    const responses = processBatch(requests);
    requests.forEach((req, i) => {
      this.auditLog.push(createAuditEntry(req, responses[i]));
    });
    return responses;
  }

  getAuditLog(): GatewayAuditEntry[] {
    return [...this.auditLog];
  }

  clearAuditLog(): void {
    this.auditLog = [];
  }
}

export function createPolicyGateway(): PolicyGateway {
  return new PolicyGateway();
}
