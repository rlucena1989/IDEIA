import { DeepDiveEngine } from '../deep-dive-engine'
import { DeepDiveRequest } from '../types'

describe('DeepDiveEngine', () => {
  let engine: DeepDiveEngine

  beforeEach(() => {
    engine = new DeepDiveEngine()
  })

  it('should generate deep dive sections', async () => {
    const request: DeepDiveRequest = {
      topic: 'Authentication System',
      context: 'JWT-based auth for API',
      targetDepth: 'advanced',
      dimensions: ['code', 'performance', 'security'],
    }
    const result = await engine.analyze(request)
    expect(result.topic).toBe('Authentication System')
    expect(result.sections.length).toBe(3)
    expect(result.totalLines).toBeGreaterThan(0)
    expect(result.codeBlocks).toBeGreaterThan(0)
    expect(result.qualityScore).toBeGreaterThan(0)
  })

  it('should generate a single section', async () => {
    const section = await engine.generateSection('Login', 'security', 'expert')
    expect(section.title).toContain('SECURITY')
    expect(section.content).toBeDefined()
    expect(section.codeExamples.length).toBeGreaterThan(0)
  })

  it('should analyze code complexity', () => {
    const analysis = engine.analyzeComplexity('class Foo<T> { async bar() { await fetch("/api") } }')
    expect(analysis.overallLevel).toBeDefined()
    expect(Object.keys(analysis.scoresByDimension).length).toBe(6)
  })

  it('should return recommendations for large code', () => {
    const largeCode = Array(300).fill('// comment').join('\n')
    const analysis = engine.analyzeComplexity(largeCode)
    expect(analysis.recommendations.length).toBeGreaterThan(0)
  })

  it('should calculate quality score', async () => {
    const request: DeepDiveRequest = {
      topic: 'Test', context: 'Test', targetDepth: 'basic', dimensions: ['architecture'],
    }
    const result = await engine.analyze(request)
    expect(result.qualityScore).toBeGreaterThanOrEqual(0)
  })
})
