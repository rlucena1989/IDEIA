import { EventEmitter } from 'node:events';

type BHPMessageType = 'HELP' | 'STATS' | 'PLAN' | 'APPROVE' | 'REJECT' | 'CLARIFY' | 'ADAPT';

export interface BHPMessage {
  id: string;
  type: BHPMessageType;
  from: string;
  to: string;
  context: string;
  payload?: Record<string, unknown>;
  timestamp: number;
  expiresAt: number;
}

interface BHPPendingMessage {
  message: BHPMessage;
  status: 'pending' | 'approved' | 'rejected' | 'expired' | 'clarified';
  respondedAt?: number;
}

export interface BHPStatus {
  pendingCount: number;
  lastMessage: BHPMessage | null;
  messages: BHPPendingMessage[];
  queueSize: number;
}

const MESSAGE_TIMEOUT = 5 * 60 * 1000;

export class BHPProtocol extends EventEmitter {
  private messages: BHPMessage[] = [];
  private pending: Map<string, BHPPendingMessage> = new Map();
  private timeoutTimer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    super();
    this.startTimeoutChecker();
  }

  private startTimeoutChecker(): void {
    this.timeoutTimer = setInterval(() => {
      const now = Date.now();
      for (const [id, pending] of this.pending) {
        if (pending.status === 'pending' && now > pending.message.expiresAt) {
          pending.status = 'expired';
          this.emit('message:expired', { id, message: pending.message });
        }
      }
    }, 30_000);
  }

  private generateId(): string {
    return `bhp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  }

  sendHelp(to: string, from: string, context: string): BHPMessage {
    const msg: BHPMessage = {
      id: this.generateId(),
      type: 'HELP',
      from,
      to,
      context,
      timestamp: Date.now(),
      expiresAt: Date.now() + MESSAGE_TIMEOUT,
    };
    this.messages.push(msg);
    this.pending.set(msg.id, { message: msg, status: 'pending' });
    this.emit('message:sent', msg);
    return msg;
  }

  sendStats(to: string, from: string, context: string, payload?: Record<string, unknown>): BHPMessage {
    const msg: BHPMessage = {
      id: this.generateId(),
      type: 'STATS',
      from,
      to,
      context,
      payload,
      timestamp: Date.now(),
      expiresAt: Date.now() + MESSAGE_TIMEOUT,
    };
    this.messages.push(msg);
    this.pending.set(msg.id, { message: msg, status: 'pending' });
    this.emit('message:sent', msg);
    return msg;
  }

  sendPlan(agent: string, plan: Record<string, unknown>): BHPMessage {
    const msg: BHPMessage = {
      id: this.generateId(),
      type: 'PLAN',
      from: agent,
      to: 'human',
      context: 'Execution plan submitted for approval',
      payload: plan,
      timestamp: Date.now(),
      expiresAt: Date.now() + MESSAGE_TIMEOUT,
    };
    this.messages.push(msg);
    this.pending.set(msg.id, { message: msg, status: 'pending' });
    this.emit('message:sent', msg);
    return msg;
  }

  approvePlan(planId: string): BHPStatus | null {
    const pending = this.pending.get(planId);
    if (!pending || pending.message.type !== 'PLAN') return null;
    pending.status = 'approved';
    pending.respondedAt = Date.now();
    this.emit('plan:approved', { id: planId, message: pending.message });
    return this.getStatus();
  }

  rejectPlan(planId: string, reason: string): BHPStatus | null {
    const pending = this.pending.get(planId);
    if (!pending || pending.message.type !== 'PLAN') return null;
    pending.status = 'rejected';
    pending.respondedAt = Date.now();
    this.emit('plan:rejected', { id: planId, reason, message: pending.message });
    return this.getStatus();
  }

  sendClarify(to: string, from: string, context: string, payload?: Record<string, unknown>): BHPMessage {
    const msg: BHPMessage = {
      id: this.generateId(),
      type: 'CLARIFY',
      from,
      to,
      context,
      payload,
      timestamp: Date.now(),
      expiresAt: Date.now() + MESSAGE_TIMEOUT,
    };
    this.messages.push(msg);
    this.pending.set(msg.id, { message: msg, status: 'pending' });
    this.emit('message:sent', msg);
    return msg;
  }

  sendAdapt(to: string, from: string, context: string, payload?: Record<string, unknown>): BHPMessage {
    const msg: BHPMessage = {
      id: this.generateId(),
      type: 'ADAPT',
      from,
      to,
      context,
      payload,
      timestamp: Date.now(),
      expiresAt: Date.now() + MESSAGE_TIMEOUT,
    };
    this.messages.push(msg);
    this.pending.set(msg.id, { message: msg, status: 'pending' });
    this.emit('message:sent', msg);
    return msg;
  }

  respond(id: string, response: string): void {
    const pending = this.pending.get(id);
    if (!pending) return;
    pending.status = 'clarified';
    pending.respondedAt = Date.now();
    this.emit('message:responded', { id, response, message: pending.message });
  }

  getStatus(): BHPStatus {
    return {
      pendingCount: Array.from(this.pending.values()).filter(p => p.status === 'pending').length,
      lastMessage: this.messages[this.messages.length - 1] || null,
      messages: Array.from(this.pending.values()),
      queueSize: this.messages.length,
    };
  }

  getPendingPlans(): BHPPendingMessage[] {
    return Array.from(this.pending.values()).filter(p => p.message.type === 'PLAN' && p.status === 'pending');
  }

  destroy(): void {
    if (this.timeoutTimer) {
      clearInterval(this.timeoutTimer);
      this.timeoutTimer = null;
    }
    this.messages = [];
    this.pending.clear();
  }
}
