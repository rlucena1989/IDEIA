import {
  ContextPackRegistry,
  InMemoryRegistryStore,
  MemoryPackLoader,
  ContextInjector,
  PackValidator,
  PackGenerator,
  PREBUILT_PACKS,
  RetrievalAugmentedContextPack,
  AttentionContextScorer,
  CompiledContextPack,
  ContextPackABTester,
  PersonalizedContextAdapter,
  HierarchicalContextManager,
} from '../src/index';
import type { ContextPack, ResolvedPack, RegistryIndexEntry, ValidationError } from '../src/index';

// ============================================================
// Section 1: Registry CRUD
// ============================================================

describe('ContextPackRegistry', () => {
  let registry: ContextPackRegistry;
  let store: InMemoryRegistryStore;

  beforeEach(() => {
    store = new InMemoryRegistryStore();
    registry = new ContextPackRegistry(
      { cacheMaxSize: 50, cacheTTL: 300_000 },
      store
    );
  });

  it('should register and retrieve a pack', async () => {
    const pack: ContextPack = {
      name: 'test-pack',
      version: '1.0.0',
      description: 'A test context pack with enough description text for validation',
      tags: ['test'],
      categories: ['testing'],
      level: 'beginner',
      variables: [],
      sections: [
        { id: 'sec1', title: 'Section 1', format: 'markdown', priority: 'P0', content: 'Test content' },
      ],
      dependencies: [],
      slicing: [],
      hooks: [],
      examples: [],
    };
    await registry.register(pack);
    const retrieved = await registry.get('test-pack');
    expect(retrieved).not.toBeNull();
    expect(retrieved!.name).toBe('test-pack');
    expect(retrieved!.version).toBe('1.0.0');
  });

  it('should return null for unknown pack', async () => {
    const retrieved = await registry.get('nonexistent');
    expect(retrieved).toBeNull();
  });

  it('should unregister a pack', async () => {
    const pack: ContextPack = {
      name: 'temp-pack',
      version: '1.0.0',
      description: 'Temporary pack that will be removed with enough description for validation',
      tags: ['temp'],
      categories: [],
      level: 'beginner',
      variables: [],
      sections: [
        { id: 's1', title: 'S1', format: 'markdown', priority: 'P0', content: 'Temp' },
      ],
      dependencies: [],
      slicing: [],
      hooks: [],
      examples: [],
    };
    await registry.register(pack);
    await registry.unregister('temp-pack', '1.0.0');
    const retrieved = await registry.get('temp-pack');
    expect(retrieved).toBeNull();
  });

  it('should list all registered packs', async () => {
    const pack1: ContextPack = {
      name: 'pack-a', version: '1.0.0', description: 'Pack A with enough description text for validation',
      tags: ['a'], categories: [], level: 'beginner', variables: [],
      sections: [{ id: 's1', title: 'S1', format: 'markdown', priority: 'P0', content: 'A' }],
      dependencies: [], slicing: [], hooks: [], examples: [],
    };
    const pack2: ContextPack = {
      name: 'pack-b', version: '1.0.0', description: 'Pack B with enough description text for validation',
      tags: ['b'], categories: [], level: 'beginner', variables: [],
      sections: [{ id: 's1', title: 'S1', format: 'markdown', priority: 'P0', content: 'B' }],
      dependencies: [], slicing: [], hooks: [], examples: [],
    };
    await registry.register(pack1);
    await registry.register(pack2);
    const list = await registry.list();
    expect(list.length).toBe(2);
    const names = list.map((e: RegistryIndexEntry) => e.name);
    expect(names).toContain('pack-a');
    expect(names).toContain('pack-b');
  });

  it('should find packs by tag', async () => {
    const pack: ContextPack = {
      name: 'tagged-pack', version: '1.0.0', description: 'Pack with custom tags for testing discovery',
      tags: ['security', 'audit'], categories: [], level: 'beginner', variables: [],
      sections: [{ id: 's1', title: 'S1', format: 'markdown', priority: 'P0', content: 'Secure' }],
      dependencies: [], slicing: [], hooks: [], examples: [],
    };
    await registry.register(pack);
    const results = await registry.findByTag('security');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].name).toBe('tagged-pack');
  });

  it('should search packs by query', async () => {
    const pack: ContextPack = {
      name: 'my-searchable-pack', version: '1.0.0',
      description: 'A searchable description for context pack testing purposes',
      tags: ['findable'], categories: [], level: 'beginner', variables: [],
      sections: [{ id: 's1', title: 'S1', format: 'markdown', priority: 'P0', content: 'Searchable' }],
      dependencies: [], slicing: [], hooks: [], examples: [],
    };
    await registry.register(pack);
    const results = await registry.search('searchable');
    expect(results.length).toBeGreaterThan(0);
  });

  it('should validate registry integrity', async () => {
    const pack: ContextPack = {
      name: 'standalone', version: '1.0.0',
      description: 'Standalone pack with no dependencies for testing validation integrity',
      tags: [], categories: [], level: 'beginner', variables: [],
      sections: [{ id: 's1', title: 'S1', format: 'markdown', priority: 'P0', content: 'Standalone' }],
      dependencies: [], slicing: [], hooks: [], examples: [],
    };
    await registry.register(pack);
    const validation = await registry.validateRegistry();
    expect(validation.valid).toBe(true);
  });
});

// ============================================================
// Section 2: Load and Inject Packs
// ============================================================

describe('ContextPackLoader and Injector', () => {
  it('MemoryPackLoader should load packs from memory', async () => {
    const loader = new MemoryPackLoader();
    const pack: ContextPack = {
      name: 'mem-pack', version: '1.0.0',
      description: 'Memory loaded pack with content for testing purposes here',
      tags: [], categories: [], level: 'beginner', variables: [],
      sections: [{ id: 's1', title: 'S1', format: 'markdown', priority: 'P0', content: 'In memory' }],
      dependencies: [], slicing: [], hooks: [], examples: [],
    };
    loader.addPack(pack);
    const loaded = await loader.load('mem-pack');
    expect(loaded).not.toBeNull();
    expect(loaded!.name).toBe('mem-pack');
  });

  it('ContextInjector should inject pack content with variables', async () => {
    const injector = new ContextInjector({
      templateEngine: 'ejs',
      packSeparator: '\n---\n',
      includeSummary: false,
      tokenTolerance: 0.1,
      cacheTemplates: true,
    });
    const pack: ContextPack = {
      name: 'test', version: '1.0.0', description: 'Test pack with variables for injection testing',
      tags: [], categories: [], level: 'beginner',
      variables: [{ name: 'task', type: 'string', description: 'Task description', required: true }],
      sections: [
        { id: 'intro', title: 'Intro', format: 'markdown', priority: 'P0',
          content: 'Task: {{task}}' },
      ],
      dependencies: [], slicing: [], hooks: [], examples: [],
    };
    const resolved: ResolvedPack = { pack, dependencies: [], resolvedAt: new Date().toISOString() };
    const result = await injector.inject([resolved], { task: 'Fix login bug' });
    expect(result.prompt).toContain('Fix login bug');
    expect(result.totalTokens).toBeGreaterThan(0);
    expect(result.sections.length).toBe(1);
  });

  it('ContextInjector should slice content when exceeding maxTokens', async () => {
    const injector = new ContextInjector({
      templateEngine: 'ejs',
      packSeparator: '\n---\n',
      includeSummary: false,
      tokenTolerance: 0.1,
      cacheTemplates: true,
    });
    const pack: ContextPack = {
      name: 'verbose', version: '1.0.0', description: 'Verbose pack with many sections for slicing tests',
      tags: [], categories: [], level: 'beginner', variables: [],
      sections: [
        { id: 'p0_1', title: 'Critical', format: 'markdown', priority: 'P0', content: 'A'.repeat(1000) },
        { id: 'p0_2', title: 'Critical 2', format: 'markdown', priority: 'P0', content: 'B'.repeat(1000) },
        { id: 'p1_1', title: 'Important', format: 'markdown', priority: 'P1', content: 'C'.repeat(1000) },
        { id: 'p2_1', title: 'Info', format: 'markdown', priority: 'P2', content: 'D'.repeat(1000) },
      ],
      dependencies: [], slicing: [], hooks: [], examples: [],
    };
    const resolved: ResolvedPack = { pack, dependencies: [], resolvedAt: new Date().toISOString() };
    const result = await injector.inject([resolved], {}, 500);
    expect(result.sliced).toBe(true);
  });
});

// ============================================================
// Section 3: Validation and Generation
// ============================================================

describe('PackValidator', () => {
  let validator: PackValidator;

  beforeEach(() => {
    validator = new PackValidator();
  });

  it('should validate a correct pack schema', () => {
    const pack: ContextPack = {
      name: 'valid-pack',
      version: '1.0.0',
      description: 'This is a valid pack with more than ten characters in description',
      tags: ['valid'],
      categories: ['test'],
      level: 'intermediate',
      variables: [],
      sections: [
        { id: 'sec1', title: 'Section 1', format: 'markdown', priority: 'P0', content: 'Valid content here' },
      ],
      dependencies: [],
      slicing: [],
      hooks: [],
      examples: [],
    };
    const result = validator.validateSchema(pack);
    expect(result.valid).toBe(true);
    expect(result.errors.length).toBe(0);
  });

  it('should detect missing name', () => {
    const result = validator.validateSchema({ version: '1.0.0', description: 'no name here in this object' });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e: ValidationError) => e.code === 'SC-01')).toBe(true);
  });

  it('should detect missing sections', () => {
    const result = validator.validateSchema({
      name: 'empty',
      version: '1.0.0',
      description: 'This pack has no sections which is an error case',
      sections: [],
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e: ValidationError) => e.code === 'SC-04')).toBe(true);
  });
});

describe('PackGenerator', () => {
  let generator: PackGenerator;

  beforeEach(() => {
    generator = new PackGenerator();
  });

  it('should generate from manifest', async () => {
    const manifest = {
      project: { name: 'TestProj', description: 'A test project for manifest generation', version: '1.0.0' },
      packages: [{ name: 'core', path: './core', description: 'Core package' }],
      capabilities: { auth: 'jwt', db: 'pgvector' },
      agents: [{ name: 'Analyst', role: 'Requirements' }],
      commands: [{ name: 'test', description: 'Run tests' }],
    };
    const pack = await generator.fromManifest(manifest);
    expect(pack.name).toBe('manifest-TestProj');
    expect(pack.sections.length).toBeGreaterThanOrEqual(4);
  });

  it('should estimate tokens', () => {
    const pack: ContextPack = {
      name: 'test', version: '1.0.0', description: 'A test pack for token estimation with enough text',
      tags: [], categories: [], level: 'beginner', variables: [],
      sections: [{ id: 's1', title: 'S1', format: 'markdown', priority: 'P0', content: 'Hello World' }],
      dependencies: [], slicing: [], hooks: [], examples: [],
    };
    const estimated = generator.estimateTokens(pack);
    expect(estimated.totalTokens).toBeGreaterThan(0);
  });

  it('should bump version patch', async () => {
    const pack: ContextPack = {
      name: 'ver', version: '1.0.0', description: 'Version test pack with adequate description length',
      tags: [], categories: [], level: 'beginner', variables: [],
      sections: [{ id: 's1', title: 'S1', format: 'markdown', priority: 'P0', content: 'Ver' }],
      dependencies: [], slicing: [], hooks: [], examples: [],
    };
    const refreshed = await generator.refresh(pack, { versionStrategy: 'patch' });
    expect(refreshed.version).toBe('1.0.1');
  });
});

// ============================================================
// Section 4: Pre-built Packs
// ============================================================

describe('PrebuiltPacks', () => {
  it('should contain all expected packs', () => {
    expect(PREBUILT_PACKS['ideia-introduction']).toBeDefined();
    expect(PREBUILT_PACKS['bugfix']).toBeDefined();
    expect(PREBUILT_PACKS['security-review']).toBeDefined();
    expect(PREBUILT_PACKS['compliance']).toBeDefined();
    expect(PREBUILT_PACKS['coding-standards']).toBeDefined();
    expect(PREBUILT_PACKS['refactor']).toBeDefined();
  });

  it('each pack should have valid structure', () => {
    for (const name of Object.keys(PREBUILT_PACKS)) {
      const pack = PREBUILT_PACKS[name] as ContextPack;
      expect(pack.name).toBe(name);
      expect(pack.version).toMatch(/^\d+\.\d+\.\d+$/);
      expect(pack.sections.length).toBeGreaterThan(0);
      expect(pack.description.length).toBeGreaterThanOrEqual(10);
    }
  });
});

// ============================================================
// Section 5: RAG Composition
// ============================================================

describe('RetrievalAugmentedContextPack', () => {
  let racp: RetrievalAugmentedContextPack;
  let samplePack: ContextPack;

  beforeEach(() => {
    racp = new RetrievalAugmentedContextPack();
    samplePack = {
      name: 'bugfix',
      version: '1.0.0',
      description: 'Bug fix context pack for testing RAG retrieval features here',
      tags: ['debug', 'fix'],
      categories: [],
      level: 'intermediate',
      variables: [],
      sections: [
        { id: 'bug_context', title: 'Bug Context', format: 'markdown', priority: 'P0',
          content: 'When debugging, first identify the reproduction steps and error boundary.' },
        { id: 'diagnosis', title: 'Diagnosis Framework', format: 'markdown', priority: 'P1',
          content: 'Use the 5 Whys method to trace root causes. Check recent commits.' },
        { id: 'fix_patterns', title: 'Fix Patterns', format: 'markdown', priority: 'P2',
          content: 'Common patterns: Null Object, Circuit Breaker, Retry with backoff.' },
      ],
      dependencies: [],
      slicing: [],
      hooks: [],
      examples: [],
    };
    racp.indexPack(samplePack);
  });

  it('should retrieve relevant sections for a bugfix query', async () => {
    const results = await racp.retrieve({
      taskType: 'bugfix',
      taskDescription: 'Fix null pointer exception in authentication module',
      maxTokens: 2000,
      minRelevance: 0.3,
    });
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].chunk.packName).toBe('bugfix');
    expect(results[0].relevanceScore).toBeGreaterThan(0.3);
    expect(results[0].confidence).toBeGreaterThan(0);
  });

  it('should respect token budget', async () => {
    const results = await racp.retrieve({
      taskType: 'bugfix',
      taskDescription: 'Critical security vulnerability in login flow',
      maxTokens: 100,
      minRelevance: 0.1,
    });
    const totalTokens = results.reduce((s: number, r) => s + r.chunk.tokens, 0);
    expect(totalTokens).toBeLessThanOrEqual(200);
  });

  it('should return empty for irrelevant high-threshold queries', async () => {
    const results = await racp.retrieve({
      taskType: 'database-design',
      taskDescription: 'PostgreSQL indexing strategy for time-series data',
      maxTokens: 2000,
      minRelevance: 0.9,
    });
    expect(results.length).toBe(0);
  });

  it('should compute embeddings deterministically', () => {
    const emb1 = (racp as any)._computeEmbedding('test input text');
    const emb2 = (racp as any)._computeEmbedding('test input text');
    expect(emb1).toEqual(emb2);
    expect(emb1.length).toBe(128);
  });

  it('should boost relevance for tag-matching queries', async () => {
    const results = await racp.retrieve({
      taskType: 'code-review',
      taskDescription: 'Review debug code for null safety issues',
      maxTokens: 2000,
      minRelevance: 0.1,
    });
    const bugContext = results.find(r => r.chunk.sectionId === 'bug_context');
    expect(bugContext).toBeDefined();
  });
});

// ============================================================
// Section 6: Attention Scoring
// ============================================================

describe('AttentionContextScorer', () => {
  let scorer: AttentionContextScorer;
  let packs: ResolvedPack[];

  beforeEach(() => {
    scorer = new AttentionContextScorer({ encoderDim: 64, numHeads: 4, temperature: 0.7 });
    const packA: ContextPack = {
      name: 'security', version: '1.0.0', description: 'Security review pack for attention scoring tests',
      tags: ['security'], categories: [], level: 'advanced', variables: [],
      sections: [
        { id: 'auth', title: 'Authentication', format: 'markdown', priority: 'P0',
          content: 'Review authentication flows including JWT, OAuth2, and session management.' },
        { id: 'injection', title: 'Injection Prevention', format: 'markdown', priority: 'P1',
          content: 'SQL injection prevention, input sanitization, parameterized queries.' },
      ],
      dependencies: [], slicing: [], hooks: [], examples: [],
    };
    const packB: ContextPack = {
      name: 'performance', version: '1.0.0', description: 'Performance optimization pack for testing',
      tags: ['perf'], categories: [], level: 'advanced', variables: [],
      sections: [
        { id: 'caching', title: 'Caching Strategy', format: 'markdown', priority: 'P0',
          content: 'Redis caching, CDN, in-memory cache, cache invalidation patterns.' },
      ],
      dependencies: [], slicing: [], hooks: [], examples: [],
    };
    packs = [
      { pack: packA, dependencies: [], resolvedAt: '' },
      { pack: packB, dependencies: [], resolvedAt: '' },
    ];
  });

  it('should score and rank sections by relevance', () => {
    const result = scorer.score('Fix authentication vulnerability in login', packs, 5);
    expect(result.rankedSections.length).toBeGreaterThan(0);
    expect(result.attentionWeights.length).toBeGreaterThan(0);
    const topSection = result.rankedSections[0];
    expect(topSection.packName).toBe('security');
  });

  it('should return empty when no sections indexed', () => {
    const emptyScorer = new AttentionContextScorer();
    const result = emptyScorer.score('test', [], 5);
    expect(result.rankedSections.length).toBe(0);
    expect(result.attentionWeights.length).toBe(0);
  });
});

// ============================================================
// Section 7: Compilation
// ============================================================

describe('CompiledContextPack', () => {
  let compiler: CompiledContextPack;
  let pack1: ContextPack;
  let pack2: ContextPack;

  beforeEach(() => {
    compiler = new CompiledContextPack({
      compressionRatio: 0.3,
      minQualityPreservation: 0.85,
      tokenReductionTarget: 4096,
      maxIterations: 5,
      preserveP0: true,
    });
    pack1 = {
      name: 'ideia-introduction', version: '1.0.0', description: 'IDEIA introduction for compilation testing',
      tags: ['core'], categories: [], level: 'beginner', variables: [],
      sections: [
        { id: 'arch', title: 'Architecture', format: 'markdown', priority: 'P0',
          content: 'IDEIA always uses 15 layers of architecture. The stack includes TypeScript, Node.js 20, React 18. Follow layered architecture strictly. Never violate layer boundaries. Ensure dependency injection follows Inversify patterns.' },
        { id: 'agents', title: 'Agents', format: 'markdown', priority: 'P0',
          content: 'Six agents: Analyst, Architect, Programmer, Reviewer, Tester, DevOps. Always use the correct agent for each task. Follow agent collaboration protocols. Implement proper handoff procedures between agents.' },
        { id: 'quality', title: 'Quality Gates', format: 'markdown', priority: 'P2',
          content: 'Four gates: Commit, PR, Release, Production. Always run lint before commit. Ensure tests pass before merge.' },
      ],
      dependencies: [], slicing: [], hooks: [], examples: [],
    };
    pack2 = {
      name: 'bugfix', version: '1.0.0', description: 'Bug fix pack for compilation testing purposes',
      tags: ['fix'], categories: [], level: 'intermediate', variables: [],
      sections: [
        { id: 'debug', title: 'Debug Process', format: 'markdown', priority: 'P0',
          content: 'Always reproduce first before fixing. Check error logs thoroughly. Use the 5 Whys method for root cause. Never assume the cause without evidence. Follow the debugging protocol step by step.' },
        { id: 'patterns', title: 'Fix Patterns', format: 'markdown', priority: 'P1',
          content: 'Common patterns: always prefer Null Object Pattern over null checks. Implement Circuit Breaker for external calls. Use Retry with exponential backoff. Include Fallback handlers for all failures.' },
      ],
      dependencies: [], slicing: [], hooks: [], examples: [],
    };
  });

  it('should compile two packs with compression', async () => {
    const compiled = await compiler.compile([pack1, pack2], 'debug-workflow');
    expect(compiled.compilationMetadata.compressionRatio).toBeLessThan(1);
    expect(compiled.compilationMetadata.qualityScore).toBeGreaterThan(0);
    expect(compiled.sections.length).toBeGreaterThan(0);
  });

  it('should preserve P0 sections in compilation', async () => {
    const compiled = await compiler.compile([pack1, pack2], 'debug-workflow');
    expect(compiled.compilationMetadata.preservedSections).toContain('arch');
    expect(compiled.compilationMetadata.preservedSections).toContain('agents');
    expect(compiled.compilationMetadata.preservedSections).toContain('debug');
  });
});

// ============================================================
// Section 8: A/B Testing
// ============================================================

describe('ContextPackABTester', () => {
  let tester: ContextPackABTester;

  beforeEach(() => {
    tester = new ContextPackABTester({
      minSampleSize: 10,
      confidenceLevel: 0.8,
      runLengthDays: 1,
      seasonalityPeriod: 24,
    });
  });

  it('should detect significant improvement', async () => {
    const result = await tester.runTest(
      'bugfix', '1.0.0', '2.0.0',
      {
        versionA: { metricValues: Array(20).fill(0.6), successes: 15, trials: 20 },
        versionB: { metricValues: Array(20).fill(0.85), successes: 18, trials: 20 },
      },
      Array(30).fill(0).map(() => 0.5 + Math.random() * 0.3)
    );
    expect(result.lift).toBeGreaterThan(0);
    expect(result.recommendation).toBe('roll_out');
  });

  it('should recommend rollback for negative lift', async () => {
    const result = await tester.runTest(
      'bugfix', '1.0.0', '2.0.0',
      {
        versionA: { metricValues: Array(20).fill(0.85), successes: 18, trials: 20 },
        versionB: { metricValues: Array(20).fill(0.4), successes: 8, trials: 20 },
      }
    );
    expect(result.lift).toBeLessThan(0);
    expect(result.recommendation).toBe('roll_back');
  });

  it('should produce credible interval', async () => {
    const result = await tester.runTest(
      'bugfix', '1.0.0', '2.0.0',
      {
        versionA: { metricValues: Array(50).fill(0.5), successes: 25, trials: 50 },
        versionB: { metricValues: Array(50).fill(0.6), successes: 30, trials: 50 },
      }
    );
    expect(result.credibleInterval[0]).toBeLessThan(result.credibleInterval[1]);
  });

  it('should recommend continue testing with small sample', async () => {
    const result = await tester.runTest(
      'bugfix', '1.0.0', '2.0.0',
      {
        versionA: { metricValues: [0.5], successes: 1, trials: 2 },
        versionB: { metricValues: [0.6], successes: 1, trials: 2 },
      }
    );
    expect(result.recommendation).toBe('continue_testing');
  });

  it('should batch test multiple packs', async () => {
    const results = await tester.batchTest([
      {
        packName: 'pack-a', versionA: '1.0.0', versionB: '2.0.0',
        metricData: { versionA: { metricValues: [0.5], successes: 5, trials: 10 }, versionB: { metricValues: [0.6], successes: 6, trials: 10 } },
      },
      {
        packName: 'pack-b', versionA: '1.0.0', versionB: '2.0.0',
        metricData: { versionA: { metricValues: [0.5], successes: 5, trials: 10 }, versionB: { metricValues: [0.7], successes: 7, trials: 10 } },
      },
    ]);
    expect(results.length).toBe(2);
  });
});

// ============================================================
// Section 9: Personalization
// ============================================================

describe('PersonalizedContextAdapter', () => {
  let adapter: PersonalizedContextAdapter;

  beforeEach(() => {
    adapter = new PersonalizedContextAdapter({
      alpha: 1, beta: 1, explorationRate: 0.3,
      decayFactor: 0.9, windowSize: 100, minObservations: 3,
    });
  });

  it('should create profile with defaults', () => {
    const profile = adapter.getOrCreateProfile('dev-1');
    expect(profile.developerId).toBe('dev-1');
    expect(profile.contextLengthPreference).toBe('balanced');
  });

  it('should learn preferences from outcomes', async () => {
    for (let i = 0; i < 10; i++) {
      await adapter.recordOutcome('dev-1', 'pack-A', `ctx-${i}`, true);
      await adapter.recordOutcome('dev-1', 'pack-B', `ctx-${i}`, false);
    }
    const selected = adapter.selectPacks('bugfix', 'dev-1', ['pack-A', 'pack-B', 'pack-C'], 2);
    expect(selected).toContain('pack-A');
    expect(selected.length).toBeLessThanOrEqual(2);
  });

  it('should explore initially when no data', () => {
    const selected1 = adapter.selectPacks('bugfix', 'dev-2', ['pack-A', 'pack-B', 'pack-C'], 1);
    expect(selected1.length).toBe(1);
    const selected2 = adapter.selectPacks('bugfix', 'dev-2', ['pack-A', 'pack-B', 'pack-C'], 2);
    expect(selected2.length).toBe(2);
  });

  it('should return existing profile', () => {
    const profile = adapter.getOrCreateProfile('dev-3', { role: 'architect' });
    const sameProfile = adapter.getOrCreateProfile('dev-3');
    expect(sameProfile.role).toBe('architect');
  });
});

// ============================================================
// Section 10: Hierarchical Inheritance
// ============================================================

describe('HierarchicalContextManager', () => {
  let manager: HierarchicalContextManager;
  let projectPack: ContextPack;
  let teamPack: ContextPack;
  let taskPack: ContextPack;

  beforeEach(() => {
    manager = new HierarchicalContextManager({
      mergeStrategy: 'most_specific',
      allowOverrideSections: true,
      allowOverrideVariables: true,
      maxDepth: 4,
    });
    projectPack = {
      name: 'security-review', version: '1.0.0',
      description: 'Base security pack for hierarchical testing with description',
      tags: ['security'], categories: [], level: 'advanced', variables: [],
      sections: [
        { id: 'scope', title: 'Scope', format: 'markdown', priority: 'P0',
          content: 'Review all public endpoints' },
        { id: 'severity', title: 'Severity Levels', format: 'markdown', priority: 'P1',
          content: 'Critical: P0, High: P1' },
      ],
      dependencies: [], slicing: [], hooks: [], examples: [],
    };
    teamPack = {
      name: 'security-review', version: '1.1.0',
      description: 'Team security pack with extended scope for hierarchical testing',
      tags: ['security', 'lgpd'], categories: [], level: 'advanced', variables: [],
      sections: [
        { id: 'scope', title: 'Scope extended', format: 'markdown', priority: 'P0',
          content: 'Review all endpoints plus data processing' },
        { id: 'lgpd', title: 'LGPD Controls', format: 'markdown', priority: 'P1',
          content: 'Consent, data portability, right to explanation' },
      ],
      dependencies: [], slicing: [], hooks: [], examples: [],
    };
    taskPack = {
      name: 'security-review', version: '1.2.0',
      description: 'Task-specific pack for penetration testing with description',
      tags: ['security', 'pentest'], categories: [], level: 'advanced', variables: [],
      sections: [
        { id: 'scope', title: 'Pentest scope', format: 'markdown', priority: 'P0',
          content: 'Auth endpoints only, OWASP Top 10' },
      ],
      dependencies: [], slicing: [], hooks: [], examples: [],
    };
  });

  it('should register hierarchy levels', () => {
    manager.register(projectPack, 'project');
    manager.register(teamPack, 'team', projectPack);
    manager.register(taskPack, 'task', teamPack);
    const resolved = manager.resolve('security-review', '1.2.0');
    expect(resolved.hierarchy.length).toBe(3);
    expect(resolved.hierarchy[0].level).toBe('project');
    expect(resolved.hierarchy[2].level).toBe('task');
  });

  it('should override sections with most-specific winning', () => {
    manager.register(projectPack, 'project');
    manager.register(teamPack, 'team', projectPack);
    manager.register(taskPack, 'task', teamPack);
    const resolved = manager.resolve('security-review', '1.2.0');
    const scopeSection = resolved.sections.find(s => s.id === 'scope');
    expect(scopeSection).toBeDefined();
    expect(scopeSection!.content).toContain('Auth endpoints only');
  });

  it('should throw error for unknown pack', () => {
    expect(() => manager.resolve('nonexistent')).toThrow();
  });
});

// ============================================================
// Section 11: Integration Flow
// ============================================================

describe('Integration Flow', () => {
  let registry: ContextPackRegistry;
  let injector: ContextInjector;
  let validator: PackValidator;

  beforeEach(() => {
    const store = new InMemoryRegistryStore();
    registry = new ContextPackRegistry(
      { cacheMaxSize: 50, cacheTTL: 300_000 },
      store
    );
    injector = new ContextInjector({
      templateEngine: 'ejs',
      packSeparator: '\n---\n',
      includeSummary: true,
      tokenTolerance: 0.1,
      cacheTemplates: true,
    });
    validator = new PackValidator();
  });

  it('full flow: register to inject', async () => {
    const pack: ContextPack = {
      name: 'integration-pack',
      version: '1.0.0',
      description: 'Integration test pack for full flow validation testing scenario',
      tags: ['integration'],
      categories: ['test'],
      level: 'intermediate',
      variables: [
        { name: 'feature', type: 'string', description: 'Feature name', required: true },
      ],
      sections: [
        { id: 'overview', title: 'Overview', format: 'markdown', priority: 'P0',
          content: '## Feature: {{feature}}' },
        { id: 'details', title: 'Details', format: 'markdown', priority: 'P1',
          content: 'Implementation details for {{feature}}.' },
      ],
      dependencies: [],
      slicing: [
        { maxTokens: 100, strategy: 'priority', maxSections: 1 },
      ],
      hooks: [],
      examples: [],
    };

    const schemaResult = validator.validateSchema(pack);
    expect(schemaResult.valid).toBe(true);

    await registry.register(pack);
    const retrieved = await registry.get('integration-pack');
    expect(retrieved).not.toBeNull();

    const resolved: ResolvedPack = {
      pack: retrieved!,
      dependencies: [],
      resolvedAt: new Date().toISOString(),
    };

    const result = await injector.inject([resolved], { feature: 'User Auth' });
    expect(result.prompt).toContain('User Auth');
    expect(result.usedPacks).toContain('integration-pack');
    expect(result.totalTokens).toBeGreaterThan(0);
  });

  it('multiple packs with dependencies', async () => {
    const base: ContextPack = {
      name: 'base-pack', version: '1.0.0',
      description: 'Base pack for multi-pack dependency integration test scenario',
      tags: ['base'], categories: [], level: 'beginner', variables: [],
      sections: [{ id: 'base', title: 'Base', format: 'markdown', priority: 'P0',
        content: 'Base context data' }],
      dependencies: [], slicing: [], hooks: [], examples: [],
    };
    const child: ContextPack = {
      name: 'child-pack', version: '1.0.0',
      description: 'Child pack with dependency on base for integration testing',
      tags: ['child'], categories: [], level: 'intermediate', variables: [],
      sections: [{ id: 'child', title: 'Child', format: 'markdown', priority: 'P0',
        content: 'Child extends base pack' }],
      dependencies: [{ pack: 'base-pack', version: '^1.0.0', required: true }],
      slicing: [], hooks: [], examples: [],
    };

    await registry.register(base);
    await registry.register(child);

    const resolved = await registry.resolve('child-pack');
    expect(resolved.dependencies.length).toBe(1);
    expect(resolved.dependencies[0].name).toBe('base-pack');

    const result = await injector.inject([resolved], {});
    expect(result.usedPacks).toContain('child-pack');
  });
});
