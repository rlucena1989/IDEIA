import { DistillationPipeline } from '../src/distillation-pipeline'
import { ReasoningDataGenerator } from '../src/data-generator'
import { TrajectoryFilter } from '../src/trajectory-filter'
import { ProfessorApiProvider } from '../src/professor-api'
import { NightlyDistillationPipeline } from '../src/nightly-pipeline'

describe('DistillationEngine', () => {
  describe('DistillationPipeline', () => {
    it('should create pipeline and run', async () => {
      const pipe = new DistillationPipeline()
      const report = await pipe.run({
        name: 'test',
        professor: { provider: 'deepseek', model: 'deepseek-reasoner', maxTokens: 1000, temperature: 0.7 },
        method: 'reasoning-r1',
        student: { modelId: 'Qwen2.5-7B', method: 'qlora', training: { epochs: 1, learningRate: 2e-4, batchSize: 1, gradientAccumulationSteps: 1, bf16: false } },
        filtering: { strategy: 'correctness', minScore: 0.5, maxSamples: 100 },
        outputPath: './test-output',
      })
      expect(report.status).toBe('completed')
      expect(report.runId).toBeTruthy()
    })
  })

  describe('ReasoningDataGenerator', () => {
    it('should generate dataset from prompts', async () => {
      const gen = new ReasoningDataGenerator()
      const dataset = await gen.generate({
        professor: { provider: 'deepseek', model: 'test-model', maxTokens: 100, temperature: 0.5 },
        prompts: ['test prompt 1', 'test prompt 2'],
        maxTokens: 100,
        method: 'reasoning-r1',
      })
      expect(dataset.samples.length).toBe(2)
      expect(dataset.professor.model).toBe('test-model')
    })
  })

  describe('TrajectoryFilter', () => {
    const samples = [
      { id: '1', prompt: 'solve math: 2x+5=13', completion: 'x=4', professorModel: 'test', verified: true, score: 0.9, metadata: {} },
      { id: '2', prompt: 'write code for fibonacci', completion: 'def fib', professorModel: 'test', verified: false, score: 0.3, metadata: {} },
      { id: '3', prompt: 'explain gravity', completion: 'gravity is', professorModel: 'test', verified: true, score: 0.7, metadata: {} },
    ] as Parameters<TrajectoryFilter['filter']>[0]

    it('should filter by correctness', () => {
      const filter = new TrajectoryFilter()
      const result = filter.filter(samples, { strategy: 'correctness', minScore: 0, maxSamples: 0 })
      expect(result.passed.length).toBe(2)
      expect(result.passed.every(s => s.verified)).toBe(true)
    })

    it('should filter by difficulty', () => {
      const filter = new TrajectoryFilter()
      const result = filter.filter(samples, { strategy: 'difficulty', minScore: 0, maxSamples: 0 })
      expect(result.passed[0]?.score).toBeGreaterThanOrEqual(result.passed[1]?.score ?? 0)
    })

    it('should filter by diversity', () => {
      const filter = new TrajectoryFilter()
      const repeated = [
        ...samples,
        { ...samples[0]!, id: '4' },
        { ...samples[1]!, id: '5' },
      ]
      const result = filter.filter(repeated, { strategy: 'diversity', minScore: 0, maxSamples: 0 })
      expect(result.passed.length).toBeLessThanOrEqual(repeated.length)
    })

    it('should respect maxSamples', () => {
      const filter = new TrajectoryFilter()
      const result = filter.filter(samples, { strategy: 'correctness', minScore: 0, maxSamples: 1 })
      expect(result.passed.length).toBe(1)
    })

    it('should apply skill-aware filtering', () => {
      const filter = new TrajectoryFilter()
      filter.registerSkill({ name: 'math', domains: ['math'], weaknessThreshold: 0.8 })
      filter.registerSkill({ name: 'code', domains: ['code', 'write'], weaknessThreshold: 0.7 })
      const result = filter.filter(samples, { strategy: 'skill-aware', minScore: 0, maxSamples: 0 })
      expect(result.stats.skillCoverage).toBeDefined()
    })
  })

  describe('ProfessorApiProvider', () => {
    it('should generate mock sample when no API key', async () => {
      const provider = new ProfessorApiProvider()
      const result = await provider.generate('test prompt', { provider: 'anthropic', model: 'claude-3-haiku', maxTokens: 100, temperature: 0.5 })
      expect(result.sample.prompt).toBe('test prompt')
      expect(result.sample.professorModel).toBe('claude-3-haiku')
      expect(result.cost).toBe(0)
    })

    it('should handle all providers', async () => {
      const provider = new ProfessorApiProvider()
      for (const p of ['anthropic', 'openai', 'deepseek'] as const) {
        const result = await provider.generate('test', { provider: p, model: `${p}-test`, maxTokens: 100, temperature: 0.5 })
        expect(result.sample.professorModel).toBe(`${p}-test`)
      }
    })
  })

  describe('NightlyDistillationPipeline', () => {
    it('should create with defaults', () => {
      const pipe = new NightlyDistillationPipeline({})
      expect(pipe.getHistory()).toEqual([])
    })

    it('should run and produce report', async () => {
      const pipe = new NightlyDistillationPipeline({ minSamples: 10, maxSamples: 100 })
      const report = await pipe.run()
      expect(report.date).toBeTruthy()
      expect(report.distillation).toBeDefined()
    })
  })
})
