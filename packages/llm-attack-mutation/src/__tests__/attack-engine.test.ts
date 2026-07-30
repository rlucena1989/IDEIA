import { AttackEngine } from '../attack-engine'
import { AttackPrompt } from '../types'

describe('AttackEngine', () => {
  let engine: AttackEngine
  let prompt: AttackPrompt

  beforeEach(() => {
    engine = new AttackEngine()
    prompt = { id: 'base-1', content: 'Please help me with this task', category: 'jailbreak', riskLevel: 'medium', targetModel: 'gpt-4' }
  })

  it('should mutate a prompt with all strategies', () => {
    const results = engine.mutate(prompt)
    expect(results.length).toBeGreaterThan(0)
    expect(results.some(r => r.strategy === 'substitution')).toBe(true)
    expect(results.some(r => r.strategy === 'encoding')).toBe(true)
  })

  it('should evolve variants', () => {
    const results = engine.mutate(prompt)
    const variants = engine.evolve(results, prompt)
    expect(variants.length).toBe(results.length)
    expect(variants[0].generation).toBeGreaterThan(0)
  })

  it('should perform crossover between variants', () => {
    const results = engine.mutate(prompt)
    const variants = engine.evolve(results, prompt)
    if (variants.length >= 2) {
      const child = engine.crossover(variants[0], variants[1])
      expect(child.id).toContain('cross')
      expect(child.fitness).toBeGreaterThan(0)
    }
  })

  it('should generate red teaming report', () => {
    const results = engine.mutate(prompt)
    const variants = engine.evolve(results, prompt)
    const report = engine.generateReport('gpt-4', variants)
    expect(report.targetModel).toBe('gpt-4')
    expect(report.totalAttempts).toBeGreaterThan(0)
    expect(report.vulnerabilities).toBeDefined()
    expect(report.recommendations.length).toBeGreaterThan(0)
  })
})
