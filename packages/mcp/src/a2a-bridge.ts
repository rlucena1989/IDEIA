import { EventEmitter } from 'events';
import { createLogger } from '@ideia/logger';
import type { A2AMessage } from './a2a';

export type BridgeMessageHandler = (message: A2AMessage) => void;

export class A2ABridge {
  private emitter = new EventEmitter();
  private agentHandlers: Map<string, BridgeMessageHandler> = new Map();
  private messageHistory: A2AMessage[] = [];
  private maxHistory = 1000;

  onMessage(callback: BridgeMessageHandler): () => void {
    this.emitter.on('message', callback);
    return () => { this.emitter.off('message', callback); };
  }

  registerAgent(agentId: string, handler: BridgeMessageHandler): void {
    this.agentHandlers.set(agentId, handler);
  }

  unregisterAgent(agentId: string): boolean {
    return this.agentHandlers.delete(agentId);
  }

  async sendMessage(targetAgent: string, message: Omit<A2AMessage, 'id' | 'timestamp'>): Promise<A2AMessage> {
    const msg: A2AMessage = {
      ...message,
      id: `bridge-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date().toISOString(),
      to: targetAgent,
    };

    this.messageHistory.push(msg);
    if (this.messageHistory.length > this.maxHistory) {
      this.messageHistory = this.messageHistory.slice(-this.maxHistory);
    }

    this.emitter.emit('message', msg);

    const handler = this.agentHandlers.get(targetAgent);
    if (handler) {
      try {
        handler(msg);
      } catch (err) {
        const errorMsg: A2AMessage = {
          id: `bridge-err-${Date.now()}`, from: 'bridge', to: msg.from || 'unknown',
          type: 'error', skill: msg.skill, payload: { error: String(err) },
          timestamp: new Date().toISOString(), correlationId: msg.id,
        };
        this.emitter.emit('message', errorMsg);
        return errorMsg;
      }
    }

    return msg;
  }

  async broadcast(message: Omit<A2AMessage, 'id' | 'timestamp' | 'to'>): Promise<A2AMessage[]> {
    const responses: A2AMessage[] = [];
    for (const agentId of this.agentHandlers.keys()) {
      const response = await this.sendMessage(agentId, { ...message, to: agentId });
      responses.push(response);
    }
    return responses;
  }

  getHistory(): A2AMessage[] {
    return [...this.messageHistory];
  }

  getRegisteredAgents(): string[] {
    return Array.from(this.agentHandlers.keys());
  }

  clearHistory(): void {
    this.messageHistory = [];
  }
}

export function createA2ABridge(): A2ABridge {
  return new A2ABridge();
}
