import { TaskType } from './classifier';

/** Tipo que define output mode. */
export type OutputMode = 'compact' | 'standard' | 'expanded' | 'forensic';

/** Tipo que define prompt template. */
export type PromptTemplate = 'default' | 'bugfix' | 'feature' | 'refactor' | 'security' | 'test' | 'docs';

/** Interface que define a estrutura de prompt route. */
export interface PromptRoute {
  template: PromptTemplate;
  outputMode: OutputMode;
  maxInputTokens: number;
  maxOutputTokens: number;
  contextStrategy: string;
}

/** Interface que define a estrutura de output budget. */
export interface OutputBudget {
  mode: OutputMode;
  maxTokens: number;
  maxLines: number;
  maxFiles: number;
  includeExplanations: boolean;
  includeCode: boolean;
  includeTests: boolean;
  includeMetrics: boolean;
}

/** Interface que define a estrutura de prompt router config. */
export interface PromptRouterConfig {
  defaultMode: OutputMode;
  compactMaxInputTokens: number;
  compactMaxOutputTokens: number;
  standardMaxInputTokens: number;
  standardMaxOutputTokens: number;
  expandedMaxInputTokens: number;
  expandedMaxOutputTokens: number;
  forensicMaxInputTokens: number;
  forensicMaxOutputTokens: number;
}

/** Processa e f a u l t_ p r o m p t_ r o u t e r_ c o n f i g. */
export const DEFAULT_PROMPT_ROUTER_CONFIG: PromptRouterConfig = {
  defaultMode: 'standard',
  compactMaxInputTokens: 4000,
  compactMaxOutputTokens: 500,
  standardMaxInputTokens: 16000,
  standardMaxOutputTokens: 2000,
  expandedMaxInputTokens: 32000,
  expandedMaxOutputTokens: 8000,
  forensicMaxInputTokens: 64000,
  forensicMaxOutputTokens: 16000,
};

const PROMPT_TEMPLATE_MAP: Record<TaskType, PromptTemplate> = {
  bugfix: 'bugfix',
  feature: 'feature',
  refactor: 'refactor',
  documentation: 'docs',
  design_change: 'feature',
  security_review: 'security',
  test_only: 'test',
  dependency_update: 'feature',
  cleanup: 'refactor',
  incident_response: 'security',
};

const OUTPUT_BUDGETS: Record<OutputMode, OutputBudget> = {
  compact: {
    mode: 'compact',
    maxTokens: 500,
    maxLines: 50,
    maxFiles: 1,
    includeExplanations: false,
    includeCode: true,
    includeTests: false,
    includeMetrics: false,
  },
  standard: {
    mode: 'standard',
    maxTokens: 2000,
    maxLines: 200,
    maxFiles: 5,
    includeExplanations: true,
    includeCode: true,
    includeTests: true,
    includeMetrics: false,
  },
  expanded: {
    mode: 'expanded',
    maxTokens: 8000,
    maxLines: 800,
    maxFiles: 15,
    includeExplanations: true,
    includeCode: true,
    includeTests: true,
    includeMetrics: true,
  },
  forensic: {
    mode: 'forensic',
    maxTokens: 16000,
    maxLines: 2000,
    maxFiles: 50,
    includeExplanations: true,
    includeCode: true,
    includeTests: true,
    includeMetrics: true,
  },
};

/**
 * Processa prompt.
 * @param taskType - Valor type.
 * @param mode - Valor mode.
 * @returns O resultado da operação.
 */
export function routePrompt(taskType: TaskType, mode?: OutputMode): PromptRoute {
  const template = PROMPT_TEMPLATE_MAP[taskType] || 'default';
  const outputMode = mode || DEFAULT_PROMPT_ROUTER_CONFIG.defaultMode;

  let strategy: string;
  switch (outputMode) {
    case 'compact': strategy = 'minimal_context'; break;
    case 'expanded': strategy = 'full_context_with_examples'; break;
    case 'forensic': strategy = 'exhaustive_context_with_audit'; break;
    default: strategy = 'balanced_context';
  }

  return { template, outputMode, maxInputTokens: getMaxInputTokens(outputMode), maxOutputTokens: getMaxOutputTokens(outputMode), contextStrategy: strategy };
}

/**
 * Obtém output budget.
 * @param mode - Valor mode.
 * @returns O resultado da operação.
 */
export function getOutputBudget(mode: OutputMode): OutputBudget {
  return { ...OUTPUT_BUDGETS[mode] };
}

/**
 * Obtém max input tokens.
 * @param mode - Valor mode.
 * @returns O resultado da operação.
 */
export function getMaxInputTokens(mode: OutputMode): number {
  const map: Record<OutputMode, number> = {
    compact: DEFAULT_PROMPT_ROUTER_CONFIG.compactMaxInputTokens,
    standard: DEFAULT_PROMPT_ROUTER_CONFIG.standardMaxInputTokens,
    expanded: DEFAULT_PROMPT_ROUTER_CONFIG.expandedMaxInputTokens,
    forensic: DEFAULT_PROMPT_ROUTER_CONFIG.forensicMaxInputTokens,
  };
  return map[mode];
}

/**
 * Obtém max output tokens.
 * @param mode - Valor mode.
 * @returns O resultado da operação.
 */
export function getMaxOutputTokens(mode: OutputMode): number {
  const map: Record<OutputMode, number> = {
    compact: DEFAULT_PROMPT_ROUTER_CONFIG.compactMaxOutputTokens,
    standard: DEFAULT_PROMPT_ROUTER_CONFIG.standardMaxOutputTokens,
    expanded: DEFAULT_PROMPT_ROUTER_CONFIG.expandedMaxOutputTokens,
    forensic: DEFAULT_PROMPT_ROUTER_CONFIG.forensicMaxOutputTokens,
  };
  return map[mode];
}

/**
 * Processa output mode.
 * @param taskType - Valor type.
 * @param confidence - Valor confidence.
 * @param budgetTokens - Valor tokens.
 * @returns O resultado da operação.
 */
export function selectOutputMode(
  taskType: TaskType,
  confidence: number,
  budgetTokens?: number,
): OutputMode {
  const highConfidenceSimple: TaskType[] = ['bugfix', 'test_only', 'dependency_update', 'documentation'];
  const moderateTypes: TaskType[] = ['refactor', 'design_change', 'cleanup'];
  const complexTypes: TaskType[] = ['feature', 'security_review', 'incident_response'];

  if (budgetTokens !== undefined) {
    if (budgetTokens < 5000) return 'compact';
    if (budgetTokens < 20000) return 'standard';
    if (budgetTokens < 50000) return 'expanded';
    return 'forensic';
  }

  if (highConfidenceSimple.includes(taskType) && confidence >= 80) return 'compact';
  if (highConfidenceSimple.includes(taskType)) return 'standard';
  if (moderateTypes.includes(taskType)) return 'standard';
  if (complexTypes.includes(taskType)) return 'expanded';
  return 'standard';
}

/**
 * Formata output budget.
 * @param budget - Valor budget.
 * @returns O resultado da operação.
 */
export function formatOutputBudget(budget: OutputBudget): string {
  return [
    `Mode: ${budget.mode}`,
    `Max Tokens: ${budget.maxTokens}`,
    `Max Lines: ${budget.maxLines}`,
    `Max Files: ${budget.maxFiles}`,
    `Explanations: ${budget.includeExplanations ? 'yes' : 'no'}`,
    `Code: ${budget.includeCode ? 'yes' : 'no'}`,
    `Tests: ${budget.includeTests ? 'yes' : 'no'}`,
    `Metrics: ${budget.includeMetrics ? 'yes' : 'no'}`,
  ].join('\n');
}
