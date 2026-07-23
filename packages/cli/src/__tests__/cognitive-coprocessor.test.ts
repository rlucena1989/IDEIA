import { normalizeInput } from '../cognitive-coprocessor/normalize';
import { computeMetrics } from '../cognitive-coprocessor/metrics';
import { rankPriorities } from '../cognitive-coprocessor/rank';
import { detectInconsistencies } from '../cognitive-coprocessor/inconsistencies';
import { simulateOutcomes } from '../cognitive-coprocessor/simulate';
import { validateAnswer } from '../cognitive-coprocessor/validate';
import { generateReasoningHints } from '../cognitive-coprocessor/hints';
import { prepareContextForLLM } from '../cognitive-coprocessor/context';

describe('COP-01: normalizeInput', () => {
  it('deve normalizar string com espaços extras', () => {
    const result = normalizeInput('  hello   world  ');
    expect(result.normalized).toBe('hello world');
    expect(result.metadata.inputType).toBe('string');
  });

  it('deve detectar anomalia para null', () => {
    const result = normalizeInput(null);
    expect(result.anomalies.length).toBeGreaterThan(0);
    expect(result.anomalies[0].type).toBe('null');
  });

  it('deve filtrar nulls de array', () => {
    const result = normalizeInput([1, null, 2, undefined, 3]);
    expect((result.normalized as unknown[]).length).toBe(3);
  });

  it('deve extrair features de objeto', () => {
    const result = normalizeInput({ a: 1, b: 'x', c: true });
    expect(result.features.length).toBeGreaterThan(0);
    expect(result.features.some(f => f.name === 'field_count')).toBe(true);
  });
});

describe('COP-02: computeMetrics', () => {
  it('deve computar métricas básicas', () => {
    const result = computeMetrics([1, 2, 3, 4, 5]);
    expect(result.metrics.length).toBeGreaterThan(0);
    const mean = result.metrics.find(m => m.label === 'mean');
    expect(mean).toBeDefined();
    expect(mean!.value).toBe(3);
  });

  it('deve retornar vazio para array vazio', () => {
    const result = computeMetrics([]);
    expect(result.metrics).toEqual([]);
    expect(result.summary).toContain('Nenhum dado numérico');
  });

  it('deve ignorar valores não numéricos', () => {
    const result = computeMetrics([1, 'a', null, 3]);
    expect(result.metrics.length).toBeGreaterThan(0);
  });

  it('deve computar median corretamente', () => {
    const result = computeMetrics([10, 20, 30, 40, 50]);
    const median = result.metrics.find(m => m.label === 'median');
    expect(median!.value).toBe(30);
  });

  it('deve aceitar objeto com valores numéricos', () => {
    const result = computeMetrics({ a: 10, b: 20, c: 30 });
    expect(result.metrics.length).toBeGreaterThan(0);
  });
});

describe('COP-03: rankPriorities', () => {
  it('deve ranquear por score descendente', () => {
    const items = [
      { id: '1', label: 'A', urgency: 10, impact: 10, risk: 10 },
      { id: '2', label: 'B', urgency: 1, impact: 1, risk: 1 },
    ];
    const result = rankPriorities(items);
    expect(result.ranked[0].label).toBe('A');
    expect(result.ranked[1].label).toBe('B');
  });

  it('deve retornar vazio para lista vazia', () => {
    const result = rankPriorities([]);
    expect(result.ranked).toEqual([]);
  });

  it('deve usar pesos customizados', () => {
    const items = [
      { id: '1', label: 'Risco alto', urgency: 1, impact: 1, risk: 10 },
      { id: '2', label: 'Urgente', urgency: 10, impact: 1, risk: 1 },
    ];
    const result = rankPriorities(items, { risk: 0.8, urgency: 0.1, impact: 0.1 });
    expect(result.ranked[0].label).toBe('Risco alto');
  });
});

describe('COP-04: detectInconsistencies', () => {
  it('deve detectar min > max', () => {
    const result = detectInconsistencies({ min: 10, max: 5 });
    expect(result.inconsistencies.length).toBeGreaterThan(0);
    expect(result.severity).toBe('high');
  });

  it('deve detectar positive e negative ambos true', () => {
    const result = detectInconsistencies({ positive: true, negative: true });
    expect(result.inconsistencies.length).toBeGreaterThan(0);
  });

  it('deve retornar none para dados consistentes', () => {
    const result = detectInconsistencies({ a: 1, b: 2 });
    expect(result.severity).toBe('none');
  });

  it('deve verificar regras de policy', () => {
    const result = detectInconsistencies(
      { temperature: 120 },
      [{ field: 'temperature', type: 'policy', condition: 'lt', expected: 100 }],
    );
    expect(result.inconsistencies.length).toBeGreaterThan(0);
  });
});

describe('COP-05: simulateOutcomes', () => {
  it('deve executar simulação determinística', () => {
    const result = simulateOutcomes({
      name: 'test',
      variables: { a: 10, b: 20 },
      rules: [{ condition: 'a > 5', outcome: 'high', weight: 2 }],
    });
    expect(result.outcomes.length).toBeGreaterThan(0);
    expect(result.confidence).toBe(1);
  });

  it('deve executar modo heurístico', () => {
    const result = simulateOutcomes(
      { name: 'test', variables: { risk: 80, effort: 30, impact: 90 } },
      { mode: 'heuristic' },
    );
    expect(result.outcomes.length).toBe(1);
  });

  it('deve executar monte-carlo com iterações', () => {
    const result = simulateOutcomes(
      { name: 'test', variables: { x: 100, y: 50 } },
      { mode: 'monte-carlo', iterations: 10 },
    );
    expect(result.outcomes.length).toBe(10);
  });
});

describe('COP-06: validateAnswer', () => {
  it('deve validar resposta correta', () => {
    const result = validateAnswer({ result: 42 });
    expect(result.valid).toBe(true);
    expect(result.score).toBe(100);
  });

  it('deve detectar null como inválido', () => {
    const result = validateAnswer(null);
    expect(result.valid).toBe(false);
    expect(result.score).toBeLessThan(100);
  });

  it('deve detectar divergência contra ground truth', () => {
    const result = validateAnswer([1, 2, 6], [1, 2, 3]);
    expect(result.issues.length).toBeGreaterThan(0);
  });

  it('deve tratar string vazia', () => {
    const result = validateAnswer('');
    expect(result.valid).toBe(false);
  });
});

describe('COP-07: generateReasoningHints', () => {
  it('deve gerar hints para cálculo', () => {
    const result = generateReasoningHints({ type: 'numerical', input: 'calcule a soma de 10 e 20' });
    expect(result.hints.length).toBeGreaterThan(0);
    expect(result.deterministicPaths.length).toBeGreaterThan(0);
  });

  it('deve gerar hints para validação', () => {
    const result = generateReasoningHints({ type: 'textual', input: 'verifique se o valor está correto' });
    expect(result.hints.some(h => h.type === 'validation')).toBe(true);
  });

  it('deve usar thresholds do contexto', () => {
    const result = generateReasoningHints(
      { type: 'numerical', input: 'compute metrics' },
      { thresholds: { max_temp: 100 } },
    );
    expect(result.hints.some(h => h.message.includes('max_temp'))).toBe(true);
  });
});

describe('COP-08: prepareContextForLLM', () => {
  it('deve gerar contexto completo para array numérico', () => {
    const result = prepareContextForLLM([10, 20, 30, 40, 50]);
    expect(result.context.normalizedInput).not.toBeNull();
    expect(result.context.metrics).not.toBeNull();
    expect(result.context.hints).not.toBeNull();
    expect(result.formatted.length).toBeGreaterThan(0);
  });

  it('deve gerar markdown com seções', () => {
    const result = prepareContextForLLM({ a: 1, b: 2 }, { format: 'markdown' });
    expect(result.formatted).toContain('Entrada Normalizada');
    expect(result.formatted).toContain('Métricas');
  });

  it('deve gerar JSON quando solicitado', () => {
    const result = prepareContextForLLM(42, { format: 'json' });
    const parsed = JSON.parse(result.formatted);
    expect(parsed.normalizedInput).toBeDefined();
    expect(parsed.metrics).toBeDefined();
  });
});
