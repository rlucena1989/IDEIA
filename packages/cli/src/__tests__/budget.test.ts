import {
  BudgetConfig,
  BudgetConsumption,
  DEFAULT_BUDGET,
  TASK_TYPE_BUDGETS,
  mergeBudgets,
  validateBudgetConfig,
  checkBudget,
  parseBudgetFromJson,
  createDefaultConsumption,
  formatBudgetReport,
} from '../runtime/budget';

describe('Budget Module', () => {
  describe('DEFAULT_BUDGET', () => {
    it('deve ter valores padrao definidos', () => {
      expect(DEFAULT_BUDGET.max_tokens).toBe(128000);
      expect(DEFAULT_BUDGET.max_files_modified).toBe(20);
      expect(DEFAULT_BUDGET.max_agents).toBe(3);
      expect(DEFAULT_BUDGET.max_runtime_seconds).toBe(600);
      expect(DEFAULT_BUDGET.max_context_size).toBe(2 * 1024 * 1024);
      expect(DEFAULT_BUDGET.min_quality_score).toBe(70);
      expect(DEFAULT_BUDGET.max_risk_level).toBe(5);
    });
  });

  describe('TASK_TYPE_BUDGETS', () => {
    it('deve conter budgets para todos os tipos de tarefa', () => {
      expect(TASK_TYPE_BUDGETS.bugfix).toBeDefined();
      expect(TASK_TYPE_BUDGETS.feature).toBeDefined();
      expect(TASK_TYPE_BUDGETS.refactor).toBeDefined();
      expect(TASK_TYPE_BUDGETS.docs).toBeDefined();
      expect(TASK_TYPE_BUDGETS.chore).toBeDefined();
    });

    it('bugfix deve ser mais restritivo que feature', () => {
      const bugfix = TASK_TYPE_BUDGETS.bugfix!;
      const feature = TASK_TYPE_BUDGETS.feature!;
      expect(bugfix.max_tokens!).toBeLessThan(feature.max_tokens!);
      expect(bugfix.max_agents!).toBeLessThan(feature.max_agents!);
      expect(bugfix.max_runtime_seconds!).toBeLessThan(feature.max_runtime_seconds!);
    });

    it('docs deve ter budget pequeno', () => {
      const docs = TASK_TYPE_BUDGETS.docs!;
      expect(docs.max_tokens!).toBe(16000);
      expect(docs.max_files_modified!).toBe(10);
      expect(docs.max_agents!).toBe(1);
      expect(docs.max_runtime_seconds!).toBe(120);
    });
  });

  describe('mergeBudgets', () => {
    it('deve retornar globalBudget quando nao ha overrides', () => {
      const result = mergeBudgets(DEFAULT_BUDGET, null, null);
      expect(result).toEqual(DEFAULT_BUDGET);
    });

    it('deve aplicar taskTypeBudget sobre globalBudget', () => {
      const result = mergeBudgets(DEFAULT_BUDGET, { max_tokens: 50000, max_agents: 2 }, null);
      expect(result.max_tokens).toBe(50000);
      expect(result.max_agents).toBe(2);
      expect(result.max_files_modified).toBe(DEFAULT_BUDGET.max_files_modified);
    });

    it('deve aplicar overrideBudget com maior precedencia', () => {
      const result = mergeBudgets(
        DEFAULT_BUDGET,
        { max_tokens: 50000 },
        { max_tokens: 25000, max_files_modified: 5 },
      );
      expect(result.max_tokens).toBe(25000);
      expect(result.max_files_modified).toBe(5);
      expect(result.max_agents).toBe(DEFAULT_BUDGET.max_agents);
    });

    it('nao deve modificar valores quando override tem campos parciais', () => {
      const result = mergeBudgets(DEFAULT_BUDGET, null, { max_runtime_seconds: 120 });
      expect(result.max_runtime_seconds).toBe(120);
      expect(result.max_tokens).toBe(DEFAULT_BUDGET.max_tokens);
    });
  });

  describe('validateBudgetConfig', () => {
    it('deve retornar array vazio para config valida', () => {
      const errors = validateBudgetConfig(DEFAULT_BUDGET);
      expect(errors).toEqual([]);
    });

    it('deve detectar max_tokens muito baixo', () => {
      const errors = validateBudgetConfig({ ...DEFAULT_BUDGET, max_tokens: 500 });
      expect(errors).toContain('max_tokens must be >= 1000');
    });

    it('deve detectar max_files_modified muito baixo', () => {
      const errors = validateBudgetConfig({ ...DEFAULT_BUDGET, max_files_modified: 0 });
      expect(errors).toContain('max_files_modified must be >= 1');
    });

    it('deve detectar max_agents muito baixo', () => {
      const errors = validateBudgetConfig({ ...DEFAULT_BUDGET, max_agents: 0 });
      expect(errors).toContain('max_agents must be >= 1');
    });

    it('deve detectar max_runtime_seconds muito baixo', () => {
      const errors = validateBudgetConfig({ ...DEFAULT_BUDGET, max_runtime_seconds: 5 });
      expect(errors).toContain('max_runtime_seconds must be >= 10');
    });

    it('deve detectar max_context_size muito baixo', () => {
      const errors = validateBudgetConfig({ ...DEFAULT_BUDGET, max_context_size: 500 });
      expect(errors).toContain('max_context_size must be >= 1024');
    });

    it('deve detectar min_quality_score fora do range', () => {
      const errorsLow = validateBudgetConfig({ ...DEFAULT_BUDGET, min_quality_score: -1 });
      expect(errorsLow).toContain('min_quality_score must be 0-100');

      const errorsHigh = validateBudgetConfig({ ...DEFAULT_BUDGET, min_quality_score: 101 });
      expect(errorsHigh).toContain('min_quality_score must be 0-100');
    });

    it('deve detectar max_risk_level fora do range', () => {
      const errorsLow = validateBudgetConfig({ ...DEFAULT_BUDGET, max_risk_level: 0 });
      expect(errorsLow).toContain('max_risk_level must be 1-10');

      const errorsHigh = validateBudgetConfig({ ...DEFAULT_BUDGET, max_risk_level: 11 });
      expect(errorsHigh).toContain('max_risk_level must be 1-10');
    });

    it('deve acumular multiplos erros', () => {
      const errors = validateBudgetConfig({
        ...DEFAULT_BUDGET,
        max_tokens: 500,
        max_files_modified: 0,
        max_agents: 0,
      });
      expect(errors.length).toBe(3);
    });
  });

  describe('checkBudget', () => {
    const config: BudgetConfig = {
      max_tokens: 10000,
      max_files_modified: 5,
      max_agents: 2,
      max_runtime_seconds: 300,
      max_context_size: 102400,
      min_quality_score: 70,
      max_risk_level: 5,
    };

    it('deve aprovar quando tudo esta dentro do limite', () => {
      const consumption: BudgetConsumption = {
        tokens_used: 5000,
        files_modified: 3,
        agents_spawned: 1,
        runtime_seconds: 120,
        context_size_bytes: 50000,
        quality_score: 85,
        risk_level: 3,
      };
      const report = checkBudget(config, consumption);
      expect(report.withinBudget).toBe(true);
      expect(report.violations).toEqual([]);
      expect(report.warnings).toEqual([]);
    });

    it('deve rejeitar quando tokens excedem limite', () => {
      const consumption = createDefaultConsumption();
      consumption.tokens_used = 15000;
      const report = checkBudget(config, consumption);
      expect(report.withinBudget).toBe(false);
      expect(report.violations.some(v => v.includes('Tokens'))).toBe(true);
    });

    it('deve rejeitar quando files_modified excede limite', () => {
      const consumption = createDefaultConsumption();
      consumption.files_modified = 10;
      const report = checkBudget(config, consumption);
      expect(report.withinBudget).toBe(false);
      expect(report.violations.some(v => v.includes('Files'))).toBe(true);
    });

    it('deve rejeitar quando agents_spawned excede limite', () => {
      const consumption = createDefaultConsumption();
      consumption.agents_spawned = 5;
      const report = checkBudget(config, consumption);
      expect(report.withinBudget).toBe(false);
      expect(report.violations.some(v => v.includes('Agents'))).toBe(true);
    });

    it('deve rejeitar quando runtime excede limite', () => {
      const consumption = createDefaultConsumption();
      consumption.runtime_seconds = 600;
      const report = checkBudget(config, consumption);
      expect(report.withinBudget).toBe(false);
      expect(report.violations.some(v => v.includes('Runtime'))).toBe(true);
    });

    it('deve rejeitar quando context_size excede limite', () => {
      const consumption = createDefaultConsumption();
      consumption.context_size_bytes = 200000;
      const report = checkBudget(config, consumption);
      expect(report.withinBudget).toBe(false);
      expect(report.violations.some(v => v.includes('Context'))).toBe(true);
    });

    it('deve rejeitar quando quality_score esta abaixo do minimo', () => {
      const consumption = createDefaultConsumption();
      consumption.quality_score = 50;
      const report = checkBudget(config, consumption);
      expect(report.withinBudget).toBe(false);
      expect(report.violations.some(v => v.includes('Quality'))).toBe(true);
    });

    it('deve rejeitar quando risk_level excede maximo', () => {
      const consumption = createDefaultConsumption();
      consumption.risk_level = 8;
      const report = checkBudget(config, consumption);
      expect(report.withinBudget).toBe(false);
      expect(report.violations.some(v => v.includes('Risk'))).toBe(true);
    });

    it('deve emitir warnings quando proximo do limite', () => {
      const consumption: BudgetConsumption = {
        tokens_used: 9000,
        files_modified: 3,
        agents_spawned: 1,
        runtime_seconds: 270,
        context_size_bytes: 50000,
        quality_score: 74,
        risk_level: 3,
      };
      const report = checkBudget(config, consumption);
      expect(report.withinBudget).toBe(true);
      expect(report.warnings.length).toBeGreaterThan(0);
      expect(report.warnings.some(w => w.includes('Tokens'))).toBe(true);
      expect(report.warnings.some(w => w.includes('Runtime'))).toBe(true);
    });

    it('deve acumular multiplas violacoes', () => {
      const consumption: BudgetConsumption = {
        tokens_used: 20000,
        files_modified: 10,
        agents_spawned: 5,
        runtime_seconds: 600,
        context_size_bytes: 50000,
        quality_score: 30,
        risk_level: 8,
      };
      const report = checkBudget(config, consumption);
      expect(report.withinBudget).toBe(false);
      expect(report.violations.length).toBeGreaterThanOrEqual(5);
    });
  });

  describe('parseBudgetFromJson', () => {
    it('deve extrair campos validos de objeto parcial', () => {
      const result = parseBudgetFromJson({ max_tokens: 50000, max_agents: 2 });
      expect(result.max_tokens).toBe(50000);
      expect(result.max_agents).toBe(2);
      expect(result.max_files_modified).toBeUndefined();
    });

    it('deve ignorar campos nao numericos', () => {
      const result = parseBudgetFromJson({ max_tokens: 'invalid', max_files_modified: true } as unknown as Record<string, unknown>);
      expect(result.max_tokens).toBeUndefined();
      expect(result.max_files_modified).toBeUndefined();
    });

    it('deve retornar objeto vazio para entrada vazia', () => {
      const result = parseBudgetFromJson({});
      expect(result).toEqual({});
    });

    it('deve extrair todos os campos quando presentes', () => {
      const result = parseBudgetFromJson({
        max_tokens: 1000,
        max_files_modified: 1,
        max_agents: 1,
        max_runtime_seconds: 10,
        max_context_size: 1024,
        min_quality_score: 0,
        max_risk_level: 10,
      });
      expect(result.max_tokens).toBe(1000);
      expect(result.max_files_modified).toBe(1);
      expect(result.max_agents).toBe(1);
      expect(result.max_runtime_seconds).toBe(10);
      expect(result.max_context_size).toBe(1024);
      expect(result.min_quality_score).toBe(0);
      expect(result.max_risk_level).toBe(10);
    });

    it('deve lidar com null/undefined retornando vazio', () => {
      expect(parseBudgetFromJson({} as Record<string, unknown>)).toEqual({});
    });
  });

  describe('checkBudget edge cases', () => {
    it('consumo exatamente no limite nao deve violar', () => {
      const config: BudgetConfig = { max_tokens: 5000, max_files_modified: 5, max_agents: 2, max_runtime_seconds: 300, max_context_size: 102400, min_quality_score: 70, max_risk_level: 5 };
      const consumption: BudgetConsumption = { tokens_used: 5000, files_modified: 5, agents_spawned: 2, runtime_seconds: 300, context_size_bytes: 102400, quality_score: 70, risk_level: 5 };
      const report = checkBudget(config, consumption);
      expect(report.withinBudget).toBe(true);
    });

    it('mergeBudgets com taskType e override simultaneos', () => {
      const result = mergeBudgets(DEFAULT_BUDGET, { max_tokens: 20000 }, { max_tokens: 10000, max_agents: 1 });
      expect(result.max_tokens).toBe(10000);
      expect(result.max_agents).toBe(1);
    });

    it('checkBudget deve emitir warning quando quality_score esta proximo do minimo', () => {
      const config: BudgetConfig = { max_tokens: 100000, max_files_modified: 20, max_agents: 3, max_runtime_seconds: 600, max_context_size: 2000000, min_quality_score: 80, max_risk_level: 5 };
      const consumption: BudgetConsumption = { tokens_used: 1000, files_modified: 1, agents_spawned: 1, runtime_seconds: 10, context_size_bytes: 1000, quality_score: 91, risk_level: 2 };
      const report = checkBudget(config, consumption);
      expect(report.withinBudget).toBe(true);
      expect(report.warnings.some(w => w.includes('Quality'))).toBe(true);
    });

    it('parseBudgetFromJson deve rejeitar valores string', () => {
      const result = parseBudgetFromJson({ max_tokens: '50000', max_files_modified: 'foo', max_agents: null } as unknown as Record<string, unknown>);
      expect(result).toEqual({});
    });

    it('validateBudgetConfig deve detectar todos os campos com valor na fronteira invalida', () => {
      const config: BudgetConfig = {
        max_tokens: 999,
        max_files_modified: 0,
        max_agents: 0,
        max_runtime_seconds: 9,
        max_context_size: 1023,
        min_quality_score: -1,
        max_risk_level: 11,
      };
      const errors = validateBudgetConfig(config);
      expect(errors.length).toBe(7);
    });
  });

  describe('createDefaultConsumption', () => {
    it('deve criar consumo zerado com valores default otimistas', () => {
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
    it('deve formatar relatorio com todas as secoes', () => {
      const config = DEFAULT_BUDGET;
      const consumption = createDefaultConsumption();
      const report = checkBudget(config, consumption);
      const formatted = formatBudgetReport(report);
      expect(formatted).toContain('Budget Report');
      expect(formatted).toContain('Within budget');
      expect(formatted).toContain('Limits:');
      expect(formatted).toContain('Consumption:');
    });

    it('deve incluir violacoes quando houver', () => {
      const config: BudgetConfig = { ...DEFAULT_BUDGET, max_tokens: 100 };
      const consumption: BudgetConsumption = { ...createDefaultConsumption(), tokens_used: 500 };
      const report = checkBudget(config, consumption);
      const formatted = formatBudgetReport(report);
      expect(formatted).toContain('VIOLATIONS:');
      expect(formatted).toContain('[FAIL]');
    });

    it('deve incluir warnings quando houver', () => {
      const config: BudgetConfig = { ...DEFAULT_BUDGET, max_tokens: 100 };
      const consumption: BudgetConsumption = { ...createDefaultConsumption(), tokens_used: 90 };
      const report = checkBudget(config, consumption);
      const formatted = formatBudgetReport(report);
      expect(formatted).toContain('Warnings:');
      expect(formatted).toContain('[WARN]');
    });
  });
});
