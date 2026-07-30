import { IncomingMessage, ServerResponse } from 'node:http';
import { createLogger } from '@ideia/logger';
import { AgentRuntime } from '@ideia/agent-runtime';
import type { Decision, RiskLevel } from '@ideia/contracts';
import { createApprovalRequest } from '../governance/approval-flow';
import { AuditTrail } from '@ideia/audit-trail';
import { FileBridge } from './file-bridge';
import { TerminalBridge } from './terminal-bridge';
import { MemoryStore } from '@ideia/memory-store';
import { IdeSession } from './session-manager';
const logger = createLogger('api-router-helpers');

export interface ApiContext {
  root: string;
  fileBridge: FileBridge;
  terminalBridge: TerminalBridge;
  memoryStore: MemoryStore;
  session: IdeSession | null;
  commands: { name: string; description: string }[];
  getSession: () => IdeSession;
  auditTrail: AuditTrail;
  agentRuntime: AgentRuntime;
  broadcast?: (type: string, data: unknown) => void;
}

export type RouteHandler = (req: IncomingMessage, res: ServerResponse, parsed: import('node:url').UrlWithParsedQuery) => void | Promise<void>;

const MAX_BODY_SIZE = 10 * 1024 * 1024;

export function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = '';
    let size = 0;
    req.on('data', (chunk: Buffer) => {
      size += chunk.length;
      if (size > MAX_BODY_SIZE) {
        req.destroy(new Error('Request body too large (max 10MB)'));
        reject(new Error('Request body too large (max 10MB)'));
        return;
      }
      body += chunk.toString();
    });
    req.on('end', () => resolve(body));
    req.on('error', (err) => reject(err));
  });
}

export function json(res: ServerResponse, data: unknown, status = 200): void {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

export function error(res: ServerResponse, msg: string, status = 400): void {
  json(res, { ok: false, error: msg }, status);
}

export async function withAgent<T>(
  ctx: ApiContext,
  params: { actionType: string; resource?: string; riskLevel?: RiskLevel; message: string },
  execute: () => Promise<T>,
): Promise<{ ok: boolean; data?: T; error?: string; decision: Decision; actionId: string }> {
  const plan = ctx.agentRuntime.run({
    message: params.message,
    actionType: params.actionType,
    resource: params.resource,
    riskLevel: params.riskLevel,
  });

  if (plan.decision === 'block') {
    return { ok: false, error: `Blocked by policy: ${plan.reason}`, decision: 'block', actionId: plan.actionId };
  }

  if (plan.decision === 'ask') {
    const request = createApprovalRequest({ action: params.actionType, requestedBy: 'ai', reason: plan.reason });
    ctx.broadcast?.('approval:request', {
      action: params.actionType,
      approvalId: request.approvalId,
      reason: plan.reason,
    });
    return { ok: false, error: `Approval needed: ${plan.reason}`, decision: 'ask', actionId: plan.actionId };
  }

  const result = await execute();
  ctx.agentRuntime.confirmExecution(plan.actionId, true);
  return { ok: true, data: result, decision: 'auto', actionId: plan.actionId };
}
