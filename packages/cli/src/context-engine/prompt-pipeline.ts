import { ContextEngine } from './index';
import { createLogger } from '@ideia/logger';
import { ProcessedPrompt, UserPrompt, PromptMetadata, IntentClassification, GuardResult, TaskPlan } from './pipeline-types';
import { IntentClassifier } from './pipeline-classifier';
import { ContextInjector } from './pipeline-context';
import { PromptOptimizer } from './pipeline-optimizer';
import { PromptGuard } from './pipeline-guard';
import { TaskPlanner } from './pipeline-planner';
import { PlanExecutor } from './pipeline-executor';

const logger = createLogger('prompt-pipeline');

export class PromptPipeline {
  private classifier = new IntentClassifier();
  private contextInjector = new ContextInjector();
  private optimizer = new PromptOptimizer();
  private guard = new PromptGuard();
  private planner = new TaskPlanner();
  private executor = new PlanExecutor();

  constructor(private contextEngine: ContextEngine) {}

  async process(userPrompt: UserPrompt): Promise<ProcessedPrompt> {
    const startTime = Date.now();
    const stagesCompleted: string[] = [];
    const prompt = userPrompt.system ? `${userPrompt.system}\n\n${userPrompt.raw}` : userPrompt.raw;

    const intent = this.classifier.classify(prompt);
    stagesCompleted.push('classify');

    const { enriched, injected } = await this.contextInjector.inject(prompt, this.contextEngine);
    stagesCompleted.push('enrich');

    const { optimized, tokenCount, originalTokens, savings } = this.optimizer.optimize(enriched);
    stagesCompleted.push('optimize');

    const guardResult = this.guard.guard(optimized);
    stagesCompleted.push('guard');

    const plan = this.planner.plan(intent);
    if (plan) stagesCompleted.push('plan');

    const metadata: PromptMetadata = {
      originalLength: prompt.length, enrichedLength: enriched.length, optimizedLength: optimized.length,
      processingTimeMs: Date.now() - startTime, stagesCompleted,
    };

    logger.info('Prompt processed', { intent: intent.category, tokens: tokenCount, stages: stagesCompleted.length });
    return { original: prompt, intent, enriched, optimized, tokenCount, originalTokens, savings, guardResult, plan, contextInjected: injected, metadata };
  }

  async execute(plan: TaskPlan): Promise<void> {
    logger.info('Executing plan', { tasks: plan.tasks.length });
    const steps = await this.executor.execute(plan);
    logger.info('Plan executed', { steps: steps.length });
  }
}

export { IntentClassifier } from './pipeline-classifier';
export { ContextInjector } from './pipeline-context';
export { PromptOptimizer } from './pipeline-optimizer';
export { PromptGuard } from './pipeline-guard';
export { TaskPlanner } from './pipeline-planner';
export { PlanExecutor } from './pipeline-executor';
export * from './pipeline-types';
