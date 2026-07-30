import {
  buildDecisionRequest,
  checkDecisionCompleteness,
  buildDecisionPrompt,
  resolveDecision,
  getOptionById,
  estimateDecisionRisk,
} from '../decision-center';
import {
  DecisionRequest,
  OrchestrationCheckpoint,
} from '../orchestration-types';

function makeCheckpoint(overrides: Partial<OrchestrationCheckpoint> = {}): OrchestrationCheckpoint {
  return {
    id: 'cp-1',
    phase: 'structuring',
    taskId: 't1',
    status: 'blocked',
    createdAt: '2026-07-26T00:00:00.000Z',
    updatedAt: '2026-07-26T00:00:00.000Z',
    contextHash: 'abc123',
    nextActions: ['decide'],
    dependencyIds: [],
    unlockIds: [],
    ...overrides,
  };
}

beforeAll(() => {
  jest.useFakeTimers({ now: 1721952000000 });
});

afterAll(() => {
  jest.useRealTimers();
});

const fixedRequest: DecisionRequest = {
  id: 'dec-1721952000000-xxxx',
  title: 'Estratégia de deploy',
  summary: 'Definir abordagem de rollout',
  context: 'Sistema em produção com 10k usuários',
  reason: 'Mudança crítica no módulo de pagamentos',
  recommendedAction: 'Realizar deploy gradual com canary',
  options: [
    { id: 'A', label: 'Conservador', description: 'Manter a abordagem de menor risco.', riskLevel: 'low', impact: 'Menor mudanca estrutural. Avanco lento mas seguro.' },
    { id: 'B', label: 'Recomendado', description: 'Seguir a recomendacao do sistema.', riskLevel: 'low', impact: 'Melhor equilibrio entre avancar e manter seguranca.', recommended: true },
    { id: 'C', label: 'Agressivo', description: 'Aumentar velocidade e escopo.', riskLevel: 'high', impact: 'Maior ganho potencial, maior risco de retrabalho.' },
    { id: 'D', label: 'Resposta Aberta', description: 'Escreva sua propria decisao detalhada.', riskLevel: 'medium', impact: 'Personalizado conforme sua analise.' },
  ],
  customAllowed: true,
  checkpointId: 'cp-1',
  createdAt: '2026-07-26T00:00:00.000Z',
};

describe('buildDecisionRequest', () => {
  it('should create a decision request with all fields', () => {
    const checkpoint = makeCheckpoint();
    const req = buildDecisionRequest(
      'Estratégia de deploy',
      'Definir abordagem de rollout',
      'Mudança crítica no módulo de pagamentos',
      'Sistema em produção com 10k usuários',
      checkpoint,
      'Realizar deploy gradual com canary',
    );

    expect(req.title).toBe('Estratégia de deploy');
    expect(req.summary).toBe('Definir abordagem de rollout');
    expect(req.reason).toBe('Mudança crítica no módulo de pagamentos');
    expect(req.context).toBe('Sistema em produção com 10k usuários');
    expect(req.recommendedAction).toBe('Realizar deploy gradual com canary');
    expect(req.checkpointId).toBe('cp-1');
    expect(req.id).toMatch(/^dec-/);
    expect(req.createdAt).toBeDefined();
  });

  it('should include all 4 default options', () => {
    const req = buildDecisionRequest('Test', 'Test', 'Test', 'Test', makeCheckpoint(), 'Test');
    expect(req.options).toHaveLength(4);
  });

  it('should mark option B as recommended', () => {
    const req = buildDecisionRequest('Test', 'Test', 'Test', 'Test', makeCheckpoint(), 'Test');
    const optionB = req.options.find(o => o.id === 'B');
    expect(optionB?.recommended).toBe(true);
  });

  it('should set customAllowed to true', () => {
    const req = buildDecisionRequest('Test', 'Test', 'Test', 'Test', makeCheckpoint(), 'Test');
    expect(req.customAllowed).toBe(true);
  });

  it('should have unique request IDs', () => {
    const checkpoint = makeCheckpoint();
    const req1 = buildDecisionRequest('Test', 'Test', 'Test', 'Test', checkpoint, 'Test');
    const req2 = buildDecisionRequest('Test', 'Test', 'Test', 'Test', checkpoint, 'Test');
    expect(req1.id).not.toBe(req2.id);
  });
});

describe('checkDecisionCompleteness', () => {
  it('should return complete for valid request', () => {
    const result = checkDecisionCompleteness(fixedRequest);
    expect(result.complete).toBe(true);
    expect(result.missing).toHaveLength(0);
  });

  it('should detect missing option A', () => {
    const req = { ...fixedRequest, options: fixedRequest.options.filter(o => o.id !== 'A') };
    const result = checkDecisionCompleteness(req);
    expect(result.complete).toBe(false);
    expect(result.missing).toContain('Opcao A ausente');
  });

  it('should detect missing option B', () => {
    const req = { ...fixedRequest, options: fixedRequest.options.filter(o => o.id !== 'B') };
    const result = checkDecisionCompleteness(req);
    expect(result.complete).toBe(false);
    expect(result.missing).toContain('Opcao B ausente');
  });

  it('should detect missing option C', () => {
    const req = { ...fixedRequest, options: fixedRequest.options.filter(o => o.id !== 'C') };
    const result = checkDecisionCompleteness(req);
    expect(result.complete).toBe(false);
    expect(result.missing).toContain('Opcao C ausente');
  });

  it('should detect missing option D', () => {
    const req = { ...fixedRequest, options: fixedRequest.options.filter(o => o.id !== 'D') };
    const result = checkDecisionCompleteness(req);
    expect(result.complete).toBe(false);
    expect(result.missing).toContain('Opcao D ausente');
  });

  it('should detect missing recommended option', () => {
    const req = { ...fixedRequest, options: fixedRequest.options.map(o => ({ ...o, recommended: undefined })) };
    const result = checkDecisionCompleteness(req);
    expect(result.complete).toBe(false);
    expect(result.missing).toContain('Nenhuma opcao marcada como recomendada');
  });

  it('should detect customAllowed being false', () => {
    const req = { ...fixedRequest, customAllowed: false };
    const result = checkDecisionCompleteness(req);
    expect(result.complete).toBe(false);
    expect(result.missing).toContain('customAllowed deve ser true');
  });

  it('should accumulate multiple missing items', () => {
    const req = { ...fixedRequest, options: [], customAllowed: false };
    const result = checkDecisionCompleteness(req);
    expect(result.complete).toBe(false);
    expect(result.missing.length).toBeGreaterThanOrEqual(5);
  });
});

describe('buildDecisionPrompt', () => {
  it('should include title in formatted output', () => {
    const prompt = buildDecisionPrompt(fixedRequest);
    expect(prompt.title).toBe('Estratégia de deploy');
    expect(prompt.formatted).toContain('Decisao necessaria: Estratégia de deploy');
  });

  it('should include context section', () => {
    const prompt = buildDecisionPrompt(fixedRequest);
    expect(prompt.formatted).toContain('Sistema em produção com 10k usuários');
  });

  it('should include reason section', () => {
    const prompt = buildDecisionPrompt(fixedRequest);
    expect(prompt.formatted).toContain('Mudança crítica no módulo de pagamentos');
  });

  it('should mark option B as recommended', () => {
    const prompt = buildDecisionPrompt(fixedRequest);
    expect(prompt.formatted).toContain('B. Recomendado (recomendado)');
  });

  it('should include quick help section', () => {
    const prompt = buildDecisionPrompt(fixedRequest);
    expect(prompt.formatted).toContain('Ajuda rapida');
  });

  it('should reference customAllowed in expected response', () => {
    const prompt = buildDecisionPrompt(fixedRequest);
    expect(prompt.formatted).toContain('C ou D');
  });

  it('should not show option D when customAllowed is false', () => {
    const req = { ...fixedRequest, customAllowed: false };
    const prompt = buildDecisionPrompt(req);
    expect(prompt.formatted).toContain('ou C');
    expect(prompt.formatted).not.toContain('C ou D');
  });

  it('should set all DecisionPrompt fields', () => {
    const prompt = buildDecisionPrompt(fixedRequest);
    expect(prompt.title).toBeDefined();
    expect(prompt.summary).toBeDefined();
    expect(prompt.reason).toBeDefined();
    expect(prompt.impact).toBeDefined();
    expect(prompt.recommendedAction).toBeDefined();
    expect(prompt.options).toHaveLength(4);
    expect(prompt.customAllowed).toBe(true);
    expect(prompt.formatted).toBeDefined();
  });
});

describe('resolveDecision', () => {
  it('should create a decision record with selected option', () => {
    const record = resolveDecision(fixedRequest, 'B');
    expect(record.decisionRequestId).toBe(fixedRequest.id);
    expect(record.selectedOptionId).toBe('B');
  });

  it('should include custom value when provided', () => {
    const record = resolveDecision(fixedRequest, 'D', 'Fazer deploy noturno com rollback automatico');
    expect(record.customValue).toBe('Fazer deploy noturno com rollback automatico');
  });

  it('should include rationale when provided', () => {
    const record = resolveDecision(fixedRequest, 'B', undefined, 'Menor risco para usuarios');
    expect(record.rationale).toBe('Menor risco para usuarios');
  });

  it('should set decidedAt timestamp', () => {
    const record = resolveDecision(fixedRequest, 'A');
    expect(record.decidedAt).toBeDefined();
    expect(typeof record.decidedAt).toBe('string');
  });

  it('should allow empty selectedOptionId', () => {
    const record = resolveDecision(fixedRequest);
    expect(record.selectedOptionId).toBeUndefined();
  });
});

describe('getOptionById', () => {
  it('should find option A', () => {
    const option = getOptionById(fixedRequest, 'A');
    expect(option).toBeDefined();
    expect(option!.label).toBe('Conservador');
  });

  it('should find option B', () => {
    const option = getOptionById(fixedRequest, 'B');
    expect(option).toBeDefined();
    expect(option!.recommended).toBe(true);
  });

  it('should return undefined for unknown option', () => {
    const option = getOptionById(fixedRequest, 'Z');
    expect(option).toBeUndefined();
  });
});

describe('estimateDecisionRisk', () => {
  it('should return low risk for conservative option', () => {
    const risk = estimateDecisionRisk(fixedRequest, 'A');
    expect(risk.riskLevel).toBe('low');
    expect(risk.reasons).toContain('Manter a abordagem de menor risco.');
  });

  it('should return high risk for aggressive option', () => {
    const risk = estimateDecisionRisk(fixedRequest, 'C');
    expect(risk.riskLevel).toBe('high');
  });

  it('should return medium risk for unknown option', () => {
    const risk = estimateDecisionRisk(fixedRequest, 'Z');
    expect(risk.riskLevel).toBe('medium');
    expect(risk.reasons).toContain('Opcao desconhecida');
  });

  it('should include option description in reasons', () => {
    const risk = estimateDecisionRisk(fixedRequest, 'B');
    expect(risk.reasons).toContain('Seguir a recomendacao do sistema.');
  });
});
