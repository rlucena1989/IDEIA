import { randomUUID } from 'crypto';
import { createLogger } from '@ideia/logger';
import {
  AgentAddress, AgentMessage, MessageType,
  A2AAgentCard, A2ASkill, A2ATask, A2AFile,
} from './types';
const logger = createLogger('a2a-protocol-handler');

export class A2AProtocolHandler {
  private _agentCard: A2AAgentCard | null = null;
  private _baseUrl: string;
  private _tasks: Map<string, A2ATask> = new Map();

  constructor(config: { baseUrl: string; name?: string; description?: string }) {
    this._baseUrl = config.baseUrl;
    this._agentCard = {
      name: config.name ?? 'IDEIA-A2A-Agent',
      description: config.description ?? 'IDEIA Agent-to-Agent Protocol Handler',
      url: config.baseUrl,
      provider: { organization: 'IDEIA', url: 'https://ideia.ai' },
      version: '1.0.0',
      capabilities: {
        skills: [],
        protocols: ['a2a', 'acp'],
        authentication: [{ scheme: 'bearer' }],
      },
    };
  }

  getAgentCard(): A2AAgentCard {
    return { ...this._agentCard! };
  }

  registerSkill(skill: A2ASkill): void {
    if (this._agentCard) {
      this._agentCard.capabilities.skills.push(skill);
    }
  }

  async discoverAgent(agentUrl: string): Promise<A2AAgentCard> {
    const response = await fetch(`${agentUrl}/.well-known/agent.json`);
    if (!response.ok) {
      throw new Error(`A2A discovery failed: ${response.status}`);
    }
    const card = await response.json() as A2AAgentCard;
    return card;
  }

  async sendTask(task: A2ATask): Promise<A2ATask> {
    const response = await fetch(`${this._baseUrl}/a2a`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.A2A_API_KEY ?? ''}`,
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: randomUUID(),
        method: 'agents.task',
        params: { task },
      }),
    });

    if (!response.ok) {
      throw new Error(`A2A request failed: ${response.status}`);
    }

    const result = await response.json() as { result: A2ATask };
    this._tasks.set(task.id, result.result);
    return result.result;
  }

  async getTask(taskId: string): Promise<A2ATask | null> {
    return this._tasks.get(taskId) ?? null;
  }

  async cancelTask(taskId: string): Promise<void> {
    this._tasks.delete(taskId);
  }

  bridgeFromACP(acpMsg: AgentMessage): A2ATask {
    const task: A2ATask = {
      id: acpMsg.id ?? randomUUID(),
      sessionId: acpMsg.metadata.correlationId,
      status: 'submitted',
      input: {
        text: typeof acpMsg.payload === 'string'
          ? acpMsg.payload
          : JSON.stringify(acpMsg.payload),
        metadata: {
          sourceProtocol: 'acp',
          originalType: acpMsg.type,
          traceId: acpMsg.metadata.traceId,
        },
      },
    };

    this._tasks.set(task.id, task);
    return task;
  }

  bridgeToACP(task: A2ATask, to: AgentAddress): AgentMessage {
    return {
      id: randomUUID(),
      type: 'request' as MessageType,
      from: { id: 'a2a-bridge', type: 'supervisor' as const, instance: 'gateway' },
      to,
      payload: {
        taskId: task.id,
        status: task.status,
        output: task.output,
        artifacts: task.artifacts,
      },
      metadata: {
        correlationId: task.sessionId,
        ttl: 60000,
        priority: 2,
        timestamp: Date.now(),
        traceId: randomUUID(),
        spanId: randomUUID(),
      },
    };
  }

  verifyVCCredential(token: string): { valid: boolean; issuer?: string; subject?: string } {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return { valid: false };
      const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString()) as Record<string, unknown>;
      return {
        valid: true,
        issuer: payload.iss as string | undefined,
        subject: payload.sub as string | undefined,
      };
    } catch {
      return { valid: false };
    }
  }
}
