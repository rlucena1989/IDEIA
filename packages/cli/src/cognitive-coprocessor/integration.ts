/**
 * integration.ts — Cognitive Coprocessor Hub (Item 7)
 *
 * Hub central do fluxo: normalize(intent) → planner → validate(plan) → simulate(plan) → execute
 * Conecta IntentClassifier → AdaptDecomposer → PlanPromptBuilder → PolicyEngine → Executor
 */

import { IntentClassifier, IntentResult } from '../planner/intent-classifier';
import { AdaptDecomposer, DecomposedTask } from '../planner/adapt-decomposer';
import { PlanPromptBuilder } from '../planner/plan-prompt-builder';

export interface CoprocessorInput {
  title: string;
  description: string;
  context?: string[];
  constraints?: string[];
}

export interface CoprocessorOutput {
  intent: IntentResult;
  plan: DecomposedTask;
  validated: boolean;
  validationErrors: string[];
  promptMessages: Array<{ role: string; content: string }>;
}

export class CognitiveCoprocessor {
  private classifier: IntentClassifier;
  private decomposer: AdaptDecomposer;
  private promptBuilder: PlanPromptBuilder;

  constructor() {
    this.classifier = new IntentClassifier();
    this.decomposer = new AdaptDecomposer();
    this.promptBuilder = new PlanPromptBuilder();
  }

  async process(input: CoprocessorInput): Promise<CoprocessorOutput> {
    const fullText = `${input.title} ${input.description}`;
    const intent = await this.classifier.classify(fullText);
    const plan = await this.decomposer.decompose({ title: input.title, description: input.description });
    const validationErrors = this.validatePlan(plan, input);
    const promptMessages = this.promptBuilder.build({
      taskType: intent.primary,
      title: input.title,
      description: input.description,
      context: input.context || [],
      constraints: input.constraints || [],
    });

    return {
      intent,
      plan,
      validated: validationErrors.length === 0,
      validationErrors,
      promptMessages,
    };
  }

  private validatePlan(plan: DecomposedTask, input: CoprocessorInput): string[] {
    const errors: string[] = [];
    if (!input.title) errors.push('Title is required');
    if (!input.description) errors.push('Description is required');
    const leafTasks = this.countLeafTasks(plan);
    if (leafTasks === 0) errors.push('Plan has no executable leaf tasks');
    if (leafTasks > 20) errors.push(`Plan has ${leafTasks} leaf tasks — consider consolidating`);
    return errors;
  }

  private countLeafTasks(task: DecomposedTask): number {
    if (task.subtasks.length === 0) return 1;
    return task.subtasks.reduce((sum, st) => sum + this.countLeafTasks(st), 0);
  }
}
