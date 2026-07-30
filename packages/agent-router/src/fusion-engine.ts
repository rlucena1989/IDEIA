import { FusionInput, FusionResult, AgentRole } from './types';
import { createLogger } from '@ideia/logger';
const logger = createLogger('fusion-engine');

export interface FusionConfig {
  mergeStrategy: 'weighted' | 'majority' | 'complementary';
  priorityOrder: AgentRole[];
}

const DEFAULT_CONFIG: FusionConfig = {
  mergeStrategy: 'complementary',
  priorityOrder: ['architect', 'reviewer', 'programmer', 'tester', 'analyst', 'devops', 'supervisor'],
};

export class FusionEngine {
  private config: FusionConfig;

  constructor(config?: Partial<FusionConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  fuse(inputs: FusionInput[]): FusionResult {
    const conflicts: string[] = [];
    const artifacts: string[] = [];
    const parts: string[] = [];

    const sorted = [...inputs].sort((a, b) => {
      const ai = this.config.priorityOrder.indexOf(a.agentRole);
      const bi = this.config.priorityOrder.indexOf(b.agentRole);
      return ai - bi;
    });

    for (const input of sorted) {
      if (input.output) {
        parts.push(`[${input.agentRole.toUpperCase()}]\n${input.output}`);
      }
      artifacts.push(...input.artifacts);
    }

    const merged = parts.join('\n\n---\n\n');
    const confidence = sorted.length > 0 ? sorted.reduce((s, i) => s + i.confidence, 0) / sorted.length : 0;

    return { merged, conflicts, artifacts: [...new Set(artifacts)], confidence };
  }
}
