import { evaluatePolicy } from '@ideia/policy-engine';
import { createLogger } from '@ideia/logger';
import type { AuditTrail, AuditEvent } from '@ideia/audit-trail';
import type { EventBus } from '@ideia/event-bus';
import type { RiskLevel, Decision } from '@ideia/contracts';

export interface PolicyExecutionMeta {
  agentId: string;
  taskId: string;
  traceId: string;
}

export interface Logger {
  warn(message: string, ...args: unknown[]): void;
  error(message: string, ...args: unknown[]): void;
  info(message: string, ...args: unknown[]): void;
}

export class PolicyError extends Error {
  constructor(
    public readonly action: string,
    public readonly reason: string,
    public readonly code: 'blocked' | 'rejected' | 'approval_required',
  ) {
    super(`PolicyError [${code}]: ${action} — ${reason}`);
    this.name = 'PolicyError';
  }
}

function createAuditEvent(
  actor: AuditEvent['actor'],
  eventType: string,
  target: string,
  decision: Decision | 'approved' | 'rejected',
  result: 'success' | 'failure' | 'pending',
  metadata?: Record<string, unknown>,
): Omit<AuditEvent, 'eventId' | 'timestamp'> {
  return { actor, eventType, target, decision, result, metadata };
}

const internalLogger = createLogger('policy-integration');

const defaultLogger: Logger = {
  warn: (msg, ...args) => internalLogger.warn(msg, args.length > 0 ? { args } as Record<string, unknown> : undefined),
  error: (msg, ...args) => internalLogger.error(msg, args.length > 0 ? { args } as Record<string, unknown> : undefined),
  info: (msg, ...args) => internalLogger.info(msg, args.length > 0 ? { args } as Record<string, unknown> : undefined),
};

export async function executeWithPolicy<T>(
  action: string,
  resource: string,
  riskLevel: RiskLevel,
  executor: () => Promise<T>,
  context: PolicyExecutionMeta,
  deps: {
    auditTrail?: AuditTrail;
    eventBus?: EventBus;
    onRequestApproval?: (action: string, reason: string) => Promise<boolean>;
    logger?: Logger;
  } = {},
): Promise<T> {
  const log = deps.logger ?? defaultLogger;

  const policy = evaluatePolicy({
    actionType: action,
    resource,
    riskLevel,
  });

  log.info(`Policy decision for "${action}" on "${resource}": ${policy.decision} (${policy.reason})`);

  if (deps.auditTrail) {
    try {
      deps.auditTrail.append(createAuditEvent('ai', 'policy.check', `${action}:${resource}`, policy.decision, 'pending', {
        agentId: context.agentId, taskId: context.taskId, traceId: context.traceId, riskLevel, policyReason: policy.reason,
      }));
    } catch (err) {
      log.error('[PolicyIntegration] Audit error: %s', err);
    }
  }

  if (policy.decision === 'block') {
    if (deps.eventBus) {
      await deps.eventBus.emit({
        type: 'policy.violated',
        source: `agent:${context.agentId}`,
        payload: {
          action, resource, riskLevel, reason: policy.reason,
          agentId: context.agentId, taskId: context.taskId,
        },
      });
    }
    throw new PolicyError(action, policy.reason, 'blocked');
  }

  if (policy.decision === 'ask') {
    if (deps.eventBus) {
      await deps.eventBus.emit({
        type: 'policy.ask',
        source: `agent:${context.agentId}`,
        payload: {
          action, resource, riskLevel, reason: policy.reason,
          agentId: context.agentId,
        },
      });
    }

    if (deps.onRequestApproval) {
      log.info(`Requesting approval for "${action}"...`);
      const approved = await deps.onRequestApproval(action, policy.reason);
      if (!approved) {
        if (deps.auditTrail) {
          deps.auditTrail.append(createAuditEvent('user', 'policy.ask.rejected', `${action}:${resource}`, 'rejected', 'failure', {
            agentId: context.agentId, taskId: context.taskId,
          }));
        }
        throw new PolicyError(action, 'Approval rejected by user', 'rejected');
      }
      log.info(`Approval granted for "${action}"`);
    } else {
      log.info(`No approval callback — auto-proceeding for "${action}"`);
    }
  }

  try {
    const result = await executor();

    if (deps.auditTrail) {
      deps.auditTrail.append(createAuditEvent('ai', 'policy.executed', `${action}:${resource}`, policy.decision, 'success', {
        agentId: context.agentId, taskId: context.taskId, traceId: context.traceId, riskLevel,
      }));
    }

    if (deps.eventBus) {
      await deps.eventBus.emit({
        type: 'policy.executed',
        source: `agent:${context.agentId}`,
        payload: { action, resource, decision: policy.decision, agentId: context.agentId, taskId: context.taskId, traceId: context.traceId },
      });
    }

    return result;
  } catch (err) {
    if (deps.auditTrail) {
      deps.auditTrail.append(createAuditEvent('ai', 'policy.executed.error', `${action}:${resource}`, policy.decision, 'failure', {
        error: String(err), agentId: context.agentId, taskId: context.taskId,
      }));
    }

    if (deps.eventBus) {
      await deps.eventBus.emit({
        type: 'policy.executed',
        source: `agent:${context.agentId}`,
        payload: { action, resource, decision: policy.decision, error: String(err), status: 'failure' },
      });
    }

    throw err;
  }
}
