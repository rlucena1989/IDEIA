import { PatternIntegration } from '../pattern-integration';
import { LlmEnrichment } from '../llm-enrichment';
import { PatternDetector, LlmLearningEngine } from '@ideia/memory-store';
import { CognitiveCoprocessor } from '../integration';

describe('PatternIntegration', () => {
  let patternIntegration: PatternIntegration;

  beforeAll(() => {
    patternIntegration = new PatternIntegration();
  });

  it('should create instance with default detector and engine', () => {
    expect(patternIntegration.getDetector()).toBeInstanceOf(PatternDetector);
    expect(patternIntegration.getLearningEngine()).toBeInstanceOf(LlmLearningEngine);
  });

  it('should record interactions and detect patterns', () => {
    patternIntegration.recordInteraction('Create unit tests for auth module');
    patternIntegration.recordInteraction('Add authentication tests');
    patternIntegration.recordInteraction('Write login test cases');
    const patterns = patternIntegration.getDetector().detect();
    expect(Array.isArray(patterns)).toBe(true);
  });

  it('should enrich context with patterns and recommendations', async () => {
    const enriched = await patternIntegration.enrichContext(
      { normalizedInput: null, metrics: null, inconsistencies: null, priorities: null, simulations: null, hints: null, validationRules: [] },
      'implement user authentication',
    );
    expect(enriched.patterns).toBeDefined();
    expect(enriched.recommendations).toBeDefined();
    expect(enriched.suggestions).toBeDefined();
    expect(Array.isArray(enriched.patterns)).toBe(true);
    expect(Array.isArray(enriched.recommendations)).toBe(true);
    expect(Array.isArray(enriched.suggestions)).toBe(true);
  });

  it('should detect and learn in one call', async () => {
    const result = await patternIntegration.detectAndLearn('Refactor database layer to use repository pattern');
    expect(result.patterns).toBeDefined();
    expect(result.recommendations).toBeDefined();
    expect(result.suggestions).toBeDefined();
  });
});

describe('LlmEnrichment', () => {
  let llmEnrichment: LlmEnrichment;

  beforeAll(() => {
    llmEnrichment = new LlmEnrichment();
  });

  it('should create instance with default provider', () => {
    expect(llmEnrichment.getProvider()).toBeDefined();
    expect(llmEnrichment.getRouter()).toBeDefined();
  });

  it('should fall back to heuristic when LLM unavailable', async () => {
    const result = await llmEnrichment.enrichSimulation(
      { name: 'test', variables: { risk: 80, effort: 30 } },
      { mode: 'heuristic' },
    );
    expect(result.outcomes).toBeDefined();
    expect(result.outcomes.length).toBeGreaterThan(0);
    expect(result.recommendations).toBeDefined();
  });

  it('should produce deterministic outcomes', async () => {
    const result = await llmEnrichment.enrichSimulation(
      { name: 'risk-analysis', variables: { risk: 85, effort: 40, impact: 70 } },
    );
    expect(result.outcomes.length).toBe(1);
    expect(result.outcomes[0].scenario).toBe('risk-analysis');
  });
});

describe('CognitiveCoprocessor with PatternIntegration', () => {
  let coprocessor: CognitiveCoprocessor;
  let patternIntegration: PatternIntegration;

  beforeAll(() => {
    coprocessor = new CognitiveCoprocessor();
    patternIntegration = new PatternIntegration();
  });

  it('should process input and enrich with patterns', async () => {
    const result = await coprocessor.process({
      title: 'Implement user authentication',
      description: 'Create login, register, and token validation endpoints',
    });

    const enriched = await patternIntegration.enrichContext(
      { normalizedInput: null, metrics: null, inconsistencies: null, priorities: null, simulations: null, hints: null, validationRules: [] },
      'authentication implementation',
    );

    expect(result.intent).toBeDefined();
    expect(result.plan).toBeDefined();
    expect(enriched.patterns).toBeDefined();
  });
});
