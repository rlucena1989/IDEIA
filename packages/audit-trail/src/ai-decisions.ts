export interface AIDecision {
  id: string;
  timestamp: string;
  agentId: string;
  actionType: string;
  input: string;
  output: string;
  model: string;
  safetyScore: number;
  jailbreakDetected: boolean;
  contentBlocked: boolean;
  humanApproved: boolean;
  durationMs: number;
  metadata: Record<string, unknown>;
}

export interface AIDecisionChain {
  sessionId: string;
  decisions: AIDecision[];
  startTime: string;
  endTime: string;
  hash: string;
}

import { createHash } from 'node:crypto';
import { createLogger } from '@ideia/logger';
const logger = createLogger('ai-decisions');

export class AIDecisionAuditor {
  private decisions: AIDecision[] = [];
  private chains = new Map<string, AIDecisionChain>();

  record(decision: AIDecision): void {
    this.decisions.push(decision);
  }

  recordSimple(params: {
    agentId: string;
    actionType: string;
    input: string;
    output: string;
    model: string;
    safetyScore: number;
    jailbreakDetected: boolean;
    contentBlocked: boolean;
    humanApproved: boolean;
    durationMs: number;
    metadata?: Record<string, unknown>;
  }): AIDecision {
    const decision: AIDecision = {
      id: `ai-dec-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
      agentId: params.agentId,
      actionType: params.actionType,
      input: params.input.substring(0, 500),
      output: params.output.substring(0, 500),
      model: params.model,
      safetyScore: params.safetyScore,
      jailbreakDetected: params.jailbreakDetected,
      contentBlocked: params.contentBlocked,
      humanApproved: params.humanApproved,
      durationMs: params.durationMs,
      metadata: params.metadata ?? {},
    };

    this.decisions.push(decision);
    return decision;
  }

  createChain(sessionId: string, decisions: AIDecision[]): AIDecisionChain {
    const sorted = [...decisions].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    const concatenated = sorted.map(d => `${d.id}:${d.timestamp}:${d.actionType}:${d.safetyScore}`).join('|');
    const hash = createHash('sha256').update(concatenated).digest('hex');

    const chain: AIDecisionChain = {
      sessionId,
      decisions: sorted,
      startTime: sorted[0]?.timestamp ?? new Date().toISOString(),
      endTime: sorted[sorted.length - 1]?.timestamp ?? new Date().toISOString(),
      hash,
    };

    this.chains.set(sessionId, chain);
    return chain;
  }

  verifyChain(sessionId: string): { valid: boolean; expectedHash: string; actualHash: string } {
    const chain = this.chains.get(sessionId);
    if (!chain) {
      return { valid: false, expectedHash: '', actualHash: 'chain_not_found' };
    }

    const sorted = [...chain.decisions].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    const concatenated = sorted.map(d => `${d.id}:${d.timestamp}:${d.actionType}:${d.safetyScore}`).join('|');
    const expectedHash = createHash('sha256').update(concatenated).digest('hex');

    return {
      valid: expectedHash === chain.hash,
      expectedHash,
      actualHash: chain.hash,
    };
  }

  getDecisions(filter?: { agentId?: string; actionType?: string; since?: string }): AIDecision[] {
    let filtered = [...this.decisions];

    if (filter?.agentId) {
      filtered = filtered.filter(d => d.agentId === filter.agentId);
    }
    if (filter?.actionType) {
      filtered = filtered.filter(d => d.actionType === filter.actionType);
    }
    if (filter?.since) {
      const since = new Date(filter.since).getTime();
      filtered = filtered.filter(d => new Date(d.timestamp).getTime() >= since);
    }

    return filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  getChains(): AIDecisionChain[] {
    return Array.from(this.chains.values());
  }

  getStats(): { totalDecisions: number; totalChains: number; blockedCount: number; humanApproved: number } {
    return {
      totalDecisions: this.decisions.length,
      totalChains: this.chains.size,
      blockedCount: this.decisions.filter(d => d.jailbreakDetected || d.contentBlocked).length,
      humanApproved: this.decisions.filter(d => d.humanApproved).length,
    };
  }

  clear(): void {
    this.decisions = [];
    this.chains.clear();
  }
}

export function createAIDecisionAuditor(): AIDecisionAuditor {
  return new AIDecisionAuditor();
}
