import { AgentCapability } from './types';
import { createLogger } from '@ideia/logger';
const logger = createLogger('load-balancer');

export class LoadBalancer {
  private roundRobinIndex: Map<string, number> = new Map();

  selectAgent(candidates: AgentCapability[]): AgentCapability | null {
    if (candidates.length === 0) return null;

    const key = candidates.map(c => c.agentId).sort().join(':');
    const currentIndex = this.roundRobinIndex.get(key) ?? 0;
    const agent = candidates[currentIndex % candidates.length];

    this.roundRobinIndex.set(key, (currentIndex + 1) % candidates.length);

    return agent;
  }

  selectLeastLoaded(candidates: AgentCapability[]): AgentCapability | null {
    if (candidates.length === 0) return null;
    return candidates.reduce((best, curr) =>
      curr.currentLoad < best.currentLoad ? curr : best
    );
  }

  selectWeightedRandom(candidates: AgentCapability[]): AgentCapability | null {
    if (candidates.length === 0) return null;

    const totalLoad = candidates.reduce((sum, c) => sum + Math.max(1, c.maxLoad - c.currentLoad), 0);
    let random = Math.random() * totalLoad;

    for (const candidate of candidates) {
      const weight = Math.max(1, candidate.maxLoad - candidate.currentLoad);
      random -= weight;
      if (random <= 0) return candidate;
    }

    return candidates[candidates.length - 1];
  }

  reset(): void {
    this.roundRobinIndex.clear();
  }
}

export function createLoadBalancer(): LoadBalancer {
  return new LoadBalancer();
}
