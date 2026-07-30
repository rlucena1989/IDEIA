import type { NucleusComponent, NucleusStatus } from './nucleus-orchestrator';
import { createLogger } from '@ideia/logger';
const logger = createLogger('intent-router');

export type IntentType = 'query' | 'command' | 'create' | 'analyze' | 'learn' | 'debug';

export interface Intent {
  type: IntentType;
  payload: string;
  context: Record<string, unknown>;
  priority: number;
  timestamp: number;
}

export interface RoutingDecision {
  intent: Intent;
  primaryComponent: NucleusComponent;
  fallbackComponents: NucleusComponent[];
  confidence: number;
}

const INTENT_ROUTING: Record<IntentType, { primary: NucleusComponent; fallbacks: NucleusComponent[] }> = {
  query: { primary: 'knowledge', fallbacks: ['llm'] },
  command: { primary: 'agent', fallbacks: ['planner'] },
  create: { primary: 'tool', fallbacks: ['agent'] },
  analyze: { primary: 'llm', fallbacks: ['knowledge'] },
  learn: { primary: 'memory', fallbacks: ['agent'] },
  debug: { primary: 'agent', fallbacks: ['tool'] },
};

export class IntentRouter {
  route(intent: Intent, status: NucleusStatus): RoutingDecision {
    const primaryComponent = this._resolveComponent(intent.type);
    const fallbackComponents = this._getFallbacks(primaryComponent);
    const confidence = this._calculateConfidence(intent, status);

    return {
      intent,
      primaryComponent,
      fallbackComponents,
      confidence,
    };
  }

  private _classifyIntent(payload: string): IntentType {
    const lower = payload.toLowerCase();
    if (lower.startsWith('query') || lower.startsWith('find') || lower.startsWith('search') || lower.startsWith('what') || lower.startsWith('how')) {
      return 'query';
    }
    if (lower.startsWith('create') || lower.startsWith('new') || lower.startsWith('generate') || lower.startsWith('build')) {
      return 'create';
    }
    if (lower.startsWith('analyze') || lower.startsWith('evaluate') || lower.startsWith('compare') || lower.startsWith('assess')) {
      return 'analyze';
    }
    if (lower.startsWith('learn') || lower.startsWith('remember') || lower.startsWith('store') || lower.startsWith('save')) {
      return 'learn';
    }
    if (lower.startsWith('debug') || lower.startsWith('trace') || lower.startsWith('inspect') || lower.startsWith('log')) {
      return 'debug';
    }
    return 'command';
  }

  private _resolveComponent(intentType: IntentType): NucleusComponent {
    return INTENT_ROUTING[intentType].primary;
  }

  private _getFallbacks(primary: NucleusComponent): NucleusComponent[] {
    for (const entry of Object.values(INTENT_ROUTING)) {
      if (entry.primary === primary) {
        return entry.fallbacks;
      }
    }
    return [];
  }

  private _calculateConfidence(intent: Intent, status: NucleusStatus): number {
    const primary = this._resolveComponent(intent.type);
    const componentHealth = status.components.find(c => c.component === primary);
    if (!componentHealth) return 0.3;
    if (componentHealth.status === 'down') return 0.1;
    if (componentHealth.status === 'degraded') return 0.5;
    return 0.9;
  }
}
