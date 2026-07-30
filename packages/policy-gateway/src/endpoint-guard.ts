import { PolicyGateway, GatewayRequest, GatewayResponse } from './gateway';
import { createLogger } from '@ideia/logger';
const logger = createLogger('endpoint-guard');

export type MutationAction = 'write' | 'delete' | 'rename' | 'create' | 'shell';

const ACTION_MAP: Record<MutationAction, string> = {
  write: 'file.write',
  delete: 'file.delete',
  rename: 'file.rename',
  create: 'file.write',
  shell: 'shell.exec',
};

const RISK_MAP: Record<MutationAction, 'low' | 'medium' | 'high'> = {
  write: 'medium',
  delete: 'high',
  rename: 'medium',
  create: 'medium',
  shell: 'high',
};

export interface GuardRequest {
  action: MutationAction;
  resource: string;
  actor?: string;
  sessionId?: string;
  bypassReason?: string;
}

export interface GuardResult {
  allowed: boolean;
  requiresApproval: boolean;
  reason: string;
  bypassed: boolean;
}

export class EndpointGuard {
  constructor(private gateway: PolicyGateway = new PolicyGateway()) {}

  check(request: GuardRequest): GuardResult {
    if (request.bypassReason) {
      return {
        allowed: true,
        requiresApproval: false,
        reason: `Bypassed: ${request.bypassReason}`,
        bypassed: true,
      };
    }

    const gwRequest: GatewayRequest = {
      actionType: ACTION_MAP[request.action],
      resource: request.resource,
      riskLevel: RISK_MAP[request.action],
      actor: request.actor,
      sessionId: request.sessionId,
    };

    const response: GatewayResponse = this.gateway.evaluate(gwRequest);

    return {
      allowed: response.allowed,
      requiresApproval: response.requiresApproval,
      reason: response.reason,
      bypassed: false,
    };
  }

  checkBatch(requests: GuardRequest[]): GuardResult[] {
    const gwRequests: GatewayRequest[] = [];
    const bypassedIndices: number[] = [];

    for (let i = 0; i < requests.length; i++) {
      const req = requests[i];
      if (req.bypassReason) {
        bypassedIndices.push(i);
      } else {
        gwRequests.push({
          actionType: ACTION_MAP[req.action],
          resource: req.resource,
          riskLevel: RISK_MAP[req.action],
          actor: req.actor,
          sessionId: req.sessionId,
        });
      }
    }

    const gwResults = gwRequests.length > 0 ? this.gateway.evaluateBatch(gwRequests) : [];
    const results: GuardResult[] = [];
    let gwIdx = 0;

    for (let i = 0; i < requests.length; i++) {
      if (bypassedIndices.includes(i)) {
        results.push({ allowed: true, requiresApproval: false, reason: `Bypassed: ${requests[i].bypassReason}`, bypassed: true });
      } else {
        const r = gwResults[gwIdx++];
        results.push({ allowed: r.allowed, requiresApproval: r.requiresApproval, reason: r.reason, bypassed: false });
      }
    }

    return results;
  }

  getAuditLog() {
    return this.gateway.getAuditLog();
  }
}

export function createEndpointGuard(gateway?: PolicyGateway): EndpointGuard {
  return new EndpointGuard(gateway || new PolicyGateway());
}
