import { AmbiguityDetector } from '../ambiguity-detector'
import { SpecGenerator } from '../spec-generator'
import { SpecValidator } from '../spec-validator'
import { SpecCompiler, SpecLexer, SpecParser } from '../spec-compiler'
import { RequirementGraph, ConflictDetector } from '../requirement-graph'
import { CoverageAnalyzer, TraceabilityManager, ImpactAnalyzer } from '../coverage-analyzer'
import { SpecificationPipeline } from '../spec-pipeline'
import { Specification } from '../types'

describe('AmbiguityDetector', () => {
  it('should detect ambiguities in text', () => {
    const detector = new AmbiguityDetector()
    const results = detector.detect('Preciso de um sistema rapido para clientes')
    expect(results.length).toBeGreaterThan(0)
    expect(results.some(r => r.type === 'metric')).toBe(true)
    expect(results.some(r => r.type === 'user')).toBe(true)
  })

  it('should detect no ambiguities in clear text', () => {
    const detector = new AmbiguityDetector()
    const results = detector.detect('Implementar API REST com Node.js e PostgreSQL para 500 usuarios simultaneos usando autenticacao JWT')
    const metricResults = results.filter(r => r.type === 'metric')
    expect(metricResults.length).toBe(0)
  })

  it('should resolve an ambiguity with an answer', () => {
    const detector = new AmbiguityDetector()
    const results = detector.detect('Um sistema rapido')
    const resolved = detector.resolve(results[0], 'Tempo de resposta < 200ms')
    expect(resolved.resolved).toBe(true)
    expect(resolved.answer).toBe('Tempo de resposta < 200ms')
  })
})

describe('SpecGenerator', () => {
  it('should generate a specification from text', async () => {
    const generator = new SpecGenerator()
    const spec = await generator.generate('Test System', 'RF-1: User login with email and password')
    expect(spec.id).toBeDefined()
    expect(spec.title).toBe('Test System')
    expect(spec.functionalRequirements.length).toBeGreaterThan(0)
  })

  it('should always have at least one user profile', async () => {
    const generator = new SpecGenerator()
    const spec = await generator.generate('Empty', 'nothing here')
    expect(spec.userProfiles.length).toBeGreaterThan(0)
    expect(spec.functionalRequirements.length).toBeGreaterThan(0)
  })
})

describe('SpecValidator', () => {
  it('should validate a spec with issues', () => {
    const validator = new SpecValidator()
    const spec: Specification = {
      id: 'test', title: 'Test', overview: 'Short',
      objectives: [], scope: { inScope: [], outOfScope: [], constraints: [] },
      userProfiles: [],
      functionalRequirements: [],
      nonFunctionalRequirements: [],
      useCases: [], acceptanceCriteria: [],
      suggestedArchitecture: {},
      createdAt: '', version: '1.0.0',
    }
    const issues = validator.validate(spec)
    expect(issues.length).toBeGreaterThan(0)
    expect(issues.some(i => i.type === 'warning')).toBe(true)
  })

  it('should detect ambiguous requirements', () => {
    const validator = new SpecValidator()
    const spec: Specification = {
      id: 'test', title: 'Test', overview: 'A system that is really fast and efficient for all users',
      objectives: [], scope: { inScope: [], outOfScope: [], constraints: [] },
      userProfiles: [{ name: 'User', role: 'user', description: 'A user' }],
      functionalRequirements: [{ id: 'FR-1', type: 'functional', description: 'O sistema deve ser rapido e eficiente', priority: 'essential' }],
      nonFunctionalRequirements: [],
      useCases: [], acceptanceCriteria: [],
      suggestedArchitecture: {},
      createdAt: '', version: '1.0.0',
    }
    const issues = validator.validate(spec)
    expect(issues.some(i => i.message.includes('ambiguous'))).toBe(true)
  })
})

describe('SpecCompiler', () => {
  it('should lex input into tokens', () => {
    const lexer = new SpecLexer()
    const tokens = lexer.tokenize('# Specification\nRF-1: Login\nUC-1: User logs in')
    expect(tokens.length).toBeGreaterThanOrEqual(3)
    expect(tokens.some(t => t.type === 'HEADING')).toBe(true)
    expect(tokens.some(t => t.type === 'REQUIREMENT')).toBe(true)
  })

  it('should compile input into compiled output', () => {
    const compiler = new SpecCompiler()
    const result = compiler.compile('# My Spec\nRF-1: User authentication\nNFR-1: Response under 200ms', 'My Spec')
    expect(result.spec).toBeDefined()
    expect(result.ast).toBeDefined()
    expect(result.tokens.length).toBeGreaterThan(0)
    expect(result.spec.functionalRequirements.length).toBeGreaterThan(0)
  })
})

describe('RequirementGraph', () => {
  it('should detect cycles', () => {
    const graph = new RequirementGraph()
    graph.addEdge({ from: 'A', to: 'B', type: 'depends' })
    graph.addEdge({ from: 'B', to: 'C', type: 'depends' })
    graph.addEdge({ from: 'C', to: 'A', type: 'depends' })
    const result = graph.detectCycles()
    expect(result.hasCycle).toBe(true)
  })

  it('should detect no cycles in DAG', () => {
    const graph = new RequirementGraph()
    graph.addEdge({ from: 'A', to: 'B', type: 'depends' })
    graph.addEdge({ from: 'B', to: 'C', type: 'depends' })
    const result = graph.detectCycles()
    expect(result.hasCycle).toBe(false)
  })

  it('should analyze impact of a change', () => {
    const graph = new RequirementGraph()
    graph.addEdge({ from: 'A', to: 'B', type: 'depends' })
    graph.addEdge({ from: 'B', to: 'C', type: 'depends' })
    graph.addEdge({ from: 'D', to: 'B', type: 'depends' })
    const impact = graph.analyzeImpact('C')
    expect(impact.affected).toContain('B')
    expect(impact.affected).toContain('A')
    expect(impact.affected).toContain('D')
  })
})

describe('ConflictDetector', () => {
  it('should detect conflicts', () => {
    const detector = new ConflictDetector()
    const reqs = [
      { id: 'FR-1', type: 'functional' as const, description: 'Use SQL', priority: 'essential' as const },
      { id: 'FR-2', type: 'functional' as const, description: 'Use NoSQL', priority: 'essential' as const },
    ]
    const edges = [{ from: 'FR-1', to: 'FR-2', type: 'conflicts' as const }]
    const result = detector.detectConflicts(reqs, edges)
    expect(result.hasConflict).toBe(true)
    expect(result.conflicts.length).toBe(1)
  })
})

describe('CoverageAnalyzer', () => {
  it('should calculate coverage', () => {
    const analyzer = new CoverageAnalyzer()
    const reqs = [
      { id: 'FR-1', type: 'functional' as const, description: 'Req 1', priority: 'essential' as const },
      { id: 'FR-2', type: 'functional' as const, description: 'Req 2', priority: 'essential' as const },
    ]
    const links = [
      { sourceId: 'FR-1', targetId: 'T-1', sourceType: 'requirement' as const, targetType: 'test' as const, linkType: 'covers' as const, strength: 1 },
    ]
    const report = analyzer.analyze(reqs, links)
    expect(report.totalRequirements).toBe(2)
    expect(report.covered).toBe(1)
    expect(report.coveragePercent).toBe(50)
    expect(report.uncovered).toContain('FR-2')
  })
})

describe('ImpactAnalyzer', () => {
  it('should analyze change impact', () => {
    const analyzer = new ImpactAnalyzer()
    const graph = new Map<string, string[]>()
    graph.set('FR-1', ['FR-2', 'FR-3'])
    graph.set('FR-2', ['FR-4'])
    const impact = analyzer.analyze('FR-1', graph)
    expect(impact.severity).toBe('medium')
    expect(impact.affectedRequirements).toContain('FR-2')
  })
})

describe('SpecificationPipeline', () => {
  it('should run the full pipeline', async () => {
    const pipeline = new SpecificationPipeline()
    const result = await pipeline.run('Test', 'RF-1: User login with email\nNFR-1: Response under 200ms')
    expect(result.success).toBe(true)
    expect(result.spec).toBeDefined()
    expect(result.compiled).toBeDefined()
    expect(result.metrics.totalDurationMs).toBeGreaterThanOrEqual(0)
    expect(result.metrics.stageDurations).toBeDefined()
  })

  it('should have metrics for all stages', async () => {
    const pipeline = new SpecificationPipeline()
    const result = await pipeline.run('Metrics Test', 'RF-1: Login')
    expect(Object.keys(result.metrics.stageDurations).length).toBeGreaterThanOrEqual(2)
  })
})
