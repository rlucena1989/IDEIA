import {
  DEFAULT_BUDGET,
  TASK_TYPE_BUDGETS,
  mergeBudgets,
  validateBudgetConfig,
  checkBudget,
  parseBudgetFromJson,
  createDefaultConsumption,
  formatBudgetReport,
  BudgetConfig,
  BudgetConsumption,
} from '../budget';

describe('mergeBudgets', () => {
  it('should return global budget when no overrides', () => {
    const result = mergeBudgets(DEFAULT_BUDGET, null, null);
    expect(result).toEqual(DEFAULT_BUDGET);
  });

  it('should merge task type budget over global', () => {
    const result = mergeBudgets(DEFAULT_BUDGET, TASK_TYPE_BUDGETS.bugfix!, null);
    expect(result.max_tokens).toBe(32000);
    expect(result.max_agents).toBe(1);
    expect(result.max_context_size).toBe(DEFAULT_BUDGET.max_context_size);
  });

  it('should let override budget take precedence', () => {
    const override: Partial<BudgetConfig> = { max_tokens: 999999 };
    const result = mergeBudgets(DEFAULT_BUDGET, TASK_TYPE_BUDGETS.bugfix!, override);
    expect(result.max_tokens).toBe(999999);
    expect(result.max_agents).toBe(1);
  });

  it('should handle empty task type budget', () => {
    const result = mergeBudgets(DEFAULT_BUDGET, {}, null);
    expect(result).toEqual(DEFAULT_BUDGET);
  });
});

describe('validateBudgetConfig', () => {
  it('should return no errors for valid config', () => {
    const errors = validateBudgetConfig(DEFAULT_BUDGET);
    expect(errors).toEqual([]);
  });

  it('should error on max_tokens < 1000', () => {
    const errors = validateBudgetConfig({ ...DEFAULT_BUDGET, max_tokens: 500 });
    expect(errors).toContain('max_tokens must be >= 1000');
  });

  it('should error on max_files_modified < 1', () => {
    const errors = validateBudgetConfig({ ...DEFAULT_BUDGET, max_files_modified: 0 });
    expect(errors).toContain('max_files_modified must be >= 1');
  });

  it('should error on max_agents < 1', () => {
    const errors = validateBudgetConfig({ ...DEFAULT_BUDGET, max_agents: 0 });
    expect(errors).toContain('max_agents must be >= 1');
  });

  it('should error on max_runtime_seconds < 10', () => {
    const errors = validateBudgetConfig({ ...DEFAULT_BUDGET, max_runtime_seconds: 5 });
    expect(errors).toContain('max_runtime_seconds must be >= 10');
  });

  it('should error on max_context_size < 1024', () => {
    const errors = validateBudgetConfig({ ...DEFAULT_BUDGET, max_context_size: 512 });
    expect(errors).toContain('max_context_size must be >= 1024');
  });

  it('should error on min_quality_score out of range', () => {
    const low = validateBudgetConfig({ ...DEFAULT_BUDGET, min_quality_score: -1 });
    expect(low).toContain('min_quality_score must be 0-100');
    const high = validateBudgetConfig({ ...DEFAULT_BUDGET, min_quality_score: 101 });
    expect(high).toContain('min_quality_score must be 0-100');
  });

  it('should error on max_risk_level out of range', () => {
    const low = validateBudgetConfig({ ...DEFAULT_BUDGET, max_risk_level: 0 });
    expect(low).toContain('max_risk_level must be 1-10');
    const high = validateBudgetConfig({ ...DEFAULT_BUDGET, max_risk_level: 11 });
    expect(high).toContain('max_risk_level must be 1-10');
  });

  it('should collect multiple errors', () => {
    const errors = validateBudgetConfig({
      ...DEFAULT_BUDGET,
      max_tokens: 500,
      max_files_modified: 0,
      max_agents: 0,
    });
    expect(errors.length).toBeGreaterThanOrEqual(3);
  });
});

describe('checkBudget', () => {
  const config: BudgetConfig = { max_tokens: 10000, max_files_modified: 5, max_agents: 2, max_runtime_seconds: 300, max_context_size: 65536, min_quality_score: 70, max_risk_level: 5 };

  it('should return withinBudget when under limits', () => {
    const consumption: BudgetConsumption = { tokens_used: 5000, files_modified: 3, agents_spawned: 1, runtime_seconds: 100, context_size_bytes: 30000, quality_score: 85, risk_level: 3 };
    const report = checkBudget(config, consumption);
    expect(report.withinBudget).toBe(true);
    expect(report.violations).toEqual([]);
    expect(report.warnings).toEqual([]);
  });

  it('should return violation when tokens exceeded', () => {
    const consumption: BudgetConsumption = { tokens_used: 15000, files_modified: 3, agents_spawned: 1, runtime_seconds: 100, context_size_bytes: 30000, quality_score: 85, risk_level: 3 };
    const report = checkBudget(config, consumption);
    expect(report.withinBudget).toBe(false);
    expect(report.violations.some(v => v.startsWith('Tokens'))).toBe(true);
  });

  it('should return warning when tokens near limit', () => {
    const consumption: BudgetConsumption = { tokens_used: 9000, files_modified: 3, agents_spawned: 1, runtime_seconds: 100, context_size_bytes: 30000, quality_score: 85, risk_level: 3 };
    const report = checkBudget(config, consumption);
    expect(report.warnings.some(w => w.startsWith('Tokens near limit'))).toBe(true);
  });

  it('should return violation when files exceeded', () => {
    const consumption: BudgetConsumption = { tokens_used: 100, files_modified: 10, agents_spawned: 1, runtime_seconds: 100, context_size_bytes: 30000, quality_score: 85, risk_level: 3 };
    const report = checkBudget(config, consumption);
    expect(report.violations.some(v => v.startsWith('Files'))).toBe(true);
  });

  it('should return violation when agents exceeded', () => {
    const consumption: BudgetConsumption = { tokens_used: 100, files_modified: 1, agents_spawned: 5, runtime_seconds: 100, context_size_bytes: 30000, quality_score: 85, risk_level: 3 };
    const report = checkBudget(config, consumption);
    expect(report.violations.some(v => v.startsWith('Agents'))).toBe(true);
  });

  it('should return violation when runtime exceeded', () => {
    const consumption: BudgetConsumption = { tokens_used: 100, files_modified: 1, agents_spawned: 1, runtime_seconds: 500, context_size_bytes: 30000, quality_score: 85, risk_level: 3 };
    const report = checkBudget(config, consumption);
    expect(report.violations.some(v => v.startsWith('Runtime'))).toBe(true);
  });

  it('should return warning when runtime near limit', () => {
    const consumption: BudgetConsumption = { tokens_used: 100, files_modified: 1, agents_spawned: 1, runtime_seconds: 270, context_size_bytes: 30000, quality_score: 85, risk_level: 3 };
    const report = checkBudget(config, consumption);
    expect(report.warnings.some(w => w.startsWith('Runtime near limit'))).toBe(true);
  });

  it('should return violation when context exceeded', () => {
    const consumption: BudgetConsumption = { tokens_used: 100, files_modified: 1, agents_spawned: 1, runtime_seconds: 100, context_size_bytes: 200000, quality_score: 85, risk_level: 3 };
    const report = checkBudget(config, consumption);
    expect(report.violations.some(v => v.startsWith('Context'))).toBe(true);
  });

  it('should return violation when quality below min', () => {
    const consumption: BudgetConsumption = { tokens_used: 100, files_modified: 1, agents_spawned: 1, runtime_seconds: 100, context_size_bytes: 10000, quality_score: 50, risk_level: 3 };
    const report = checkBudget(config, consumption);
    expect(report.violations.some(v => v.startsWith('Quality'))).toBe(true);
  });

  it('should return warning when quality near minimum', () => {
    const consumption: BudgetConsumption = { tokens_used: 100, files_modified: 1, agents_spawned: 1, runtime_seconds: 100, context_size_bytes: 10000, quality_score: 75, risk_level: 3 };
    const report = checkBudget(config, consumption);
    expect(report.warnings.some(w => w.startsWith('Quality near minimum'))).toBe(true);
  });

  it('should return violation when risk level exceeded', () => {
    const consumption: BudgetConsumption = { tokens_used: 100, files_modified: 1, agents_spawned: 1, runtime_seconds: 100, context_size_bytes: 10000, quality_score: 85, risk_level: 10 };
    const report = checkBudget(config, consumption);
    expect(report.violations.some(v => v.startsWith('Risk level'))).toBe(true);
  });

  it('should collect multiple violations', () => {
    const consumption: BudgetConsumption = { tokens_used: 20000, files_modified: 10, agents_spawned: 5, runtime_seconds: 500, context_size_bytes: 200000, quality_score: 30, risk_level: 10 };
    const report = checkBudget(config, consumption);
    expect(report.violations.length).toBeGreaterThanOrEqual(6);
    expect(report.withinBudget).toBe(false);
  });
});

describe('parseBudgetFromJson', () => {
  it('should parse valid numbers', () => {
    const result = parseBudgetFromJson({ max_tokens: 50000, min_quality_score: 80 });
    expect(result.max_tokens).toBe(50000);
    expect(result.min_quality_score).toBe(80);
  });

  it('should ignore non-number values', () => {
    const result = parseBudgetFromJson({ max_tokens: '50000', max_agents: true });
    expect(result.max_tokens).toBeUndefined();
    expect(result.max_agents).toBeUndefined();
  });

  it('should return empty object for empty input', () => {
    const result = parseBudgetFromJson({});
    expect(result).toEqual({});
  });

  it('should handle partial data', () => {
    const result = parseBudgetFromJson({ max_tokens: 100, max_files_modified: 5 });
    expect(result.max_tokens).toBe(100);
    expect(result.max_files_modified).toBe(5);
    expect(result.max_agents).toBeUndefined();
  });
});

describe('createDefaultConsumption', () => {
  it('should return zeroed consumption with max quality and min risk', () => {
    const c = createDefaultConsumption();
    expect(c.tokens_used).toBe(0);
    expect(c.files_modified).toBe(0);
    expect(c.agents_spawned).toBe(0);
    expect(c.runtime_seconds).toBe(0);
    expect(c.context_size_bytes).toBe(0);
    expect(c.quality_score).toBe(100);
    expect(c.risk_level).toBe(1);
  });
});

describe('formatBudgetReport', () => {
  it('should return formatted string', () => {
    const config: BudgetConfig = { max_tokens: 10000, max_files_modified: 5, max_agents: 2, max_runtime_seconds: 300, max_context_size: 65536, min_quality_score: 70, max_risk_level: 5 };
    const consumption: BudgetConsumption = { tokens_used: 5000, files_modified: 3, agents_spawned: 1, runtime_seconds: 100, context_size_bytes: 30000, quality_score: 85, risk_level: 3 };
    const report = checkBudget(config, consumption);
    const formatted = formatBudgetReport(report);
    expect(formatted).toContain('Budget Report');
    expect(formatted).toContain('Within budget: YES');
  });

  it('should include violations section', () => {
    const config: BudgetConfig = { max_tokens: 1000, max_files_modified: 1, max_agents: 1, max_runtime_seconds: 10, max_context_size: 1024, min_quality_score: 90, max_risk_level: 1 };
    const consumption: BudgetConsumption = { tokens_used: 9999, files_modified: 99, agents_spawned: 99, runtime_seconds: 999, context_size_bytes: 99999, quality_score: 10, risk_level: 10 };
    const report = checkBudget(config, consumption);
    const formatted = formatBudgetReport(report);
    expect(formatted).toContain('VIOLATIONS');
    expect(formatted).toContain('Within budget: NO');
  });

  it('should include warnings section', () => {
    const config: BudgetConfig = { max_tokens: 10000, max_files_modified: 5, max_agents: 2, max_runtime_seconds: 300, max_context_size: 65536, min_quality_score: 70, max_risk_level: 5 };
    const consumption: BudgetConsumption = { tokens_used: 9000, files_modified: 1, agents_spawned: 1, runtime_seconds: 270, context_size_bytes: 10000, quality_score: 76, risk_level: 3 };
    const report = checkBudget(config, consumption);
    const formatted = formatBudgetReport(report);
    expect(formatted).toContain('Warnings');
  });
});
