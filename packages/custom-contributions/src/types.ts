import { Contribution, Disposable } from '@ideia/core-contributions';
import { createLogger } from '@ideia/logger';
const logger = createLogger('types');

export interface ToolContribution extends Contribution<unknown> {
  readonly toolId: string;
  readonly description: string;
  execute(input: unknown): Promise<unknown>;
}

export interface AgentContribution extends Contribution<unknown> {
  readonly agentId: string;
  readonly capabilities: string[];
  readonly model?: string;
  readonly autonomyLevel: number;
  execute(task: string, context?: unknown): Promise<unknown>;
}

export interface EnablementRule {
  readonly id: string;
  readonly condition: string;
  readonly targetIds: string[];
  readonly enabled: boolean;
}

export interface EnablementService {
  registerRule(rule: EnablementRule): Disposable;
  isEnabled(targetId: string, context: Record<string, unknown>): boolean;
  getRules(): EnablementRule[];
  onRulesChanged: import('@ideia/core-contributions').Event<void>;
}

export interface ContributionEnablement {
  enabled: boolean;
  when?: string;
  priority?: number;
}
