/** Interface que define a estrutura de budget config. */
export interface BudgetConfig {
  max_tokens: number;
  max_files_modified: number;
  max_agents: number;
  max_runtime_seconds: number;
  max_context_size: number;
  min_quality_score: number;
  max_risk_level: number;
}

/** Interface que define a estrutura de budget consumption. */
export interface BudgetConsumption {
  tokens_used: number;
  files_modified: number;
  agents_spawned: number;
  runtime_seconds: number;
  context_size_bytes: number;
  quality_score: number;
  risk_level: number;
}

/** Interface que define a estrutura de budget report. */
export interface BudgetReport {
  config: BudgetConfig;
  consumption: BudgetConsumption;
  withinBudget: boolean;
  violations: string[];
  warnings: string[];
}

/** Processa e f a u l t_ b u d g e t. */
export const DEFAULT_BUDGET: BudgetConfig = {
  max_tokens: 128000,
  max_files_modified: 20,
  max_agents: 3,
  max_runtime_seconds: 600,
  max_context_size: 2 * 1024 * 1024,
  min_quality_score: 70,
  max_risk_level: 5,
};

/** Processa a s k_ t y p e_ b u d g e t s. */
export const TASK_TYPE_BUDGETS: Record<string, Partial<BudgetConfig>> = {
  bugfix: {
    max_tokens: 32000,
    max_files_modified: 5,
    max_agents: 1,
    max_runtime_seconds: 300,
    min_quality_score: 80,
    max_risk_level: 3,
  },
  feature: {
    max_tokens: 128000,
    max_files_modified: 20,
    max_agents: 3,
    max_runtime_seconds: 900,
    min_quality_score: 75,
    max_risk_level: 5,
  },
  refactor: {
    max_tokens: 64000,
    max_files_modified: 15,
    max_agents: 2,
    max_runtime_seconds: 600,
    min_quality_score: 85,
    max_risk_level: 4,
  },
  docs: {
    max_tokens: 16000,
    max_files_modified: 10,
    max_agents: 1,
    max_runtime_seconds: 120,
    min_quality_score: 60,
    max_risk_level: 2,
  },
  chore: {
    max_tokens: 8000,
    max_files_modified: 5,
    max_agents: 1,
    max_runtime_seconds: 120,
    min_quality_score: 60,
    max_risk_level: 2,
  },
};

/**
 * Mescla budgets.
 * @param globalBudget - Valor budget.
 * @param taskTypeBudget - Valor type budget.
 * @param overrideBudget - Valor budget.
 * @returns O resultado da operação.
 */
export function mergeBudgets(
  globalBudget: BudgetConfig,
  taskTypeBudget: Partial<BudgetConfig> | null,
  overrideBudget: Partial<BudgetConfig> | null,
): BudgetConfig {
  const merged = { ...globalBudget };
  if (taskTypeBudget) {
    for (const key of Object.keys(merged) as (keyof BudgetConfig)[]) {
      if (taskTypeBudget[key] !== undefined) {
        (merged as Record<string, number>)[key] = taskTypeBudget[key] as number;
      }
    }
  }
  if (overrideBudget) {
    for (const key of Object.keys(merged) as (keyof BudgetConfig)[]) {
      if (overrideBudget[key] !== undefined) {
        (merged as Record<string, number>)[key] = overrideBudget[key] as number;
      }
    }
  }
  return merged;
}

/**
 * Valida budget config.
 * @param config - Valor config.
 * @returns O resultado da operação.
 */
export function validateBudgetConfig(config: BudgetConfig): string[] {
  const errors: string[] = [];
  if (config.max_tokens < 1000) errors.push('max_tokens must be >= 1000');
  if (config.max_files_modified < 1) errors.push('max_files_modified must be >= 1');
  if (config.max_agents < 1) errors.push('max_agents must be >= 1');
  if (config.max_runtime_seconds < 10) errors.push('max_runtime_seconds must be >= 10');
  if (config.max_context_size < 1024) errors.push('max_context_size must be >= 1024');
  if (config.min_quality_score < 0 || config.min_quality_score > 100) errors.push('min_quality_score must be 0-100');
  if (config.max_risk_level < 1 || config.max_risk_level > 10) errors.push('max_risk_level must be 1-10');
  return errors;
}

/**
 * Verifica budget.
 * @param config - Valor config.
 * @param consumption - Valor consumption.
 * @returns O resultado da operação.
 */
export function checkBudget(
  config: BudgetConfig,
  consumption: BudgetConsumption,
): BudgetReport {
  const violations: string[] = [];
  const warnings: string[] = [];

  if (consumption.tokens_used > config.max_tokens) {
    violations.push(`Tokens: ${consumption.tokens_used} > ${config.max_tokens}`);
  } else if (consumption.tokens_used > config.max_tokens * 0.85) {
    warnings.push(`Tokens near limit: ${consumption.tokens_used}/${config.max_tokens}`);
  }

  if (consumption.files_modified > config.max_files_modified) {
    violations.push(`Files: ${consumption.files_modified} > ${config.max_files_modified}`);
  }

  if (consumption.agents_spawned > config.max_agents) {
    violations.push(`Agents: ${consumption.agents_spawned} > ${config.max_agents}`);
  }

  if (consumption.runtime_seconds > config.max_runtime_seconds) {
    violations.push(`Runtime: ${consumption.runtime_seconds}s > ${config.max_runtime_seconds}s`);
  } else if (consumption.runtime_seconds > config.max_runtime_seconds * 0.85) {
    warnings.push(`Runtime near limit: ${consumption.runtime_seconds}s/${config.max_runtime_seconds}s`);
  }

  if (consumption.context_size_bytes > config.max_context_size) {
    violations.push(`Context: ${consumption.context_size_bytes} bytes > ${config.max_context_size} bytes`);
  }

  if (consumption.quality_score < config.min_quality_score) {
    violations.push(`Quality: ${consumption.quality_score} < ${config.min_quality_score}`);
  } else if (consumption.quality_score < config.min_quality_score * 1.15) {
    warnings.push(`Quality near minimum: ${consumption.quality_score}/${config.min_quality_score}`);
  }

  if (consumption.risk_level > config.max_risk_level) {
    violations.push(`Risk level: ${consumption.risk_level} > ${config.max_risk_level}`);
  }

  return {
    config,
    consumption,
    withinBudget: violations.length === 0,
    violations,
    warnings,
  };
}

/**
 * Analisa budget from json.
 * @param data - Valor data.
 * @returns O resultado da operação.
 */
export function parseBudgetFromJson(data: Record<string, unknown>): Partial<BudgetConfig> {
  const budget: Partial<BudgetConfig> = {};
  if (typeof data.max_tokens === 'number') budget.max_tokens = data.max_tokens;
  if (typeof data.max_files_modified === 'number') budget.max_files_modified = data.max_files_modified;
  if (typeof data.max_agents === 'number') budget.max_agents = data.max_agents;
  if (typeof data.max_runtime_seconds === 'number') budget.max_runtime_seconds = data.max_runtime_seconds;
  if (typeof data.max_context_size === 'number') budget.max_context_size = data.max_context_size;
  if (typeof data.min_quality_score === 'number') budget.min_quality_score = data.min_quality_score;
  if (typeof data.max_risk_level === 'number') budget.max_risk_level = data.max_risk_level;
  return budget;
}

/**
 * Cria default consumption.
 * @returns O resultado da operação.
 */
export function createDefaultConsumption(): BudgetConsumption {
  return {
    tokens_used: 0,
    files_modified: 0,
    agents_spawned: 0,
    runtime_seconds: 0,
    context_size_bytes: 0,
    quality_score: 100,
    risk_level: 1,
  };
}

/**
 * Formata budget report.
 * @param report - Valor report.
 * @returns O resultado da operação.
 */
export function formatBudgetReport(report: BudgetReport): string {
  const lines: string[] = [];
  lines.push('=== Budget Report ===');
  lines.push(`Within budget: ${report.withinBudget ? 'YES' : 'NO'}`);
  lines.push('');
  lines.push('Limits:');
  lines.push(`  Tokens:        ${report.config.max_tokens}`);
  lines.push(`  Files:          ${report.config.max_files_modified}`);
  lines.push(`  Agents:         ${report.config.max_agents}`);
  lines.push(`  Runtime:        ${report.config.max_runtime_seconds}s`);
  lines.push(`  Context:        ${(report.config.max_context_size / 1024).toFixed(0)} KB`);
  lines.push(`  Quality (min):  ${report.config.min_quality_score}`);
  lines.push(`  Risk (max):     ${report.config.max_risk_level}`);
  lines.push('');
  lines.push('Consumption:');
  lines.push(`  Tokens:        ${report.consumption.tokens_used}`);
  lines.push(`  Files:          ${report.consumption.files_modified}`);
  lines.push(`  Agents:         ${report.consumption.agents_spawned}`);
  lines.push(`  Runtime:        ${report.consumption.runtime_seconds}s`);
  lines.push(`  Context:        ${(report.consumption.context_size_bytes / 1024).toFixed(0)} KB`);
  lines.push(`  Quality:        ${report.consumption.quality_score}`);
  lines.push(`  Risk:           ${report.consumption.risk_level}`);

  if (report.violations.length > 0) {
    lines.push('');
    lines.push('VIOLATIONS:');
    for (const v of report.violations) lines.push(`  [FAIL] ${v}`);
  }

  if (report.warnings.length > 0) {
    lines.push('');
    lines.push('Warnings:');
    for (const w of report.warnings) lines.push(`  [WARN] ${w}`);
  }

  return lines.join('\n');
}
