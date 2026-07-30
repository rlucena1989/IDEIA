import { applyR1Template, classifyPrompt, extractReasoningChain, formatAsR1Sample, getR1Template } from '../src/r1-prompt-templates'
import { DatasetExporter } from '../src/dataset-exporter'
import { ReasoningDataGenerator } from '../src/data-generator'
import { ProfessorApiProvider } from '../src/professor-api'
import type { DistillationDataset, DistillationSample } from '../src/types'

describe('R1 Prompt Templates', () => {
  it('should classify math prompts', () => {
    expect(classifyPrompt('Solve the equation 2x + 5 = 13')).toBe('math')
    expect(classifyPrompt('Calculate the integral of x^2 dx')).toBe('math')
  })

  it('should classify code prompts', () => {
    expect(classifyPrompt('Write a function to sort an array')).toBe('code')
    expect(classifyPrompt('Implement a binary search tree')).toBe('code')
  })

  it('should classify reasoning prompts', () => {
    expect(classifyPrompt('Explain why the sky is blue')).toBe('reasoning')
    expect(classifyPrompt('Compare and contrast two approaches')).toBe('reasoning')
  })

  it('should fall back to general for unknown prompts', () => {
    expect(classifyPrompt('What is the capital of France?')).toBe('general')
  })

  it('should wrap prompt with R1 template', () => {
    const result = applyR1Template('Solve 2x + 5 = 13')
    expect(result.systemPrompt).toContain('mathematician')
    expect(result.wrappedPrompt).toContain('Solve 2x + 5 = 13')
    expect(result.wrappedPrompt).toContain('step by step')
  })

  it('should extract reasoning chain from completion', () => {
    const completion = '[thinking]\nFirst, subtract 5 from both sides\n[/thinking]\nThe answer is x = 4'
    const { thinking, answer } = extractReasoningChain(completion)
    expect(thinking).toContain('subtract 5')
    expect(answer).toContain('x = 4')
  })

  it('should handle completion without thinking block', () => {
    const { thinking, answer } = extractReasoningChain('The answer is 42')
    expect(thinking).toBe('')
    expect(answer).toBe('The answer is 42')
  })

  it('should format as R1 sample', () => {
    const formatted = formatAsR1Sample('What is 2+2?', '[thinking]\nAdd them\n[/thinking]\n4')
    expect(formatted).toContain('<thinking>')
    expect(formatted).toContain('<answer>')
  })

  it('should return correct template for category', () => {
    const template = getR1Template('code')
    expect(template.category).toBe('code')
    expect(template.systemPrompt).toContain('programmer')
  })
})

describe('DatasetExporter', () => {
  let exporter: DatasetExporter
  const sampleDataset: DistillationDataset = {
    id: 'test-ds', name: 'test-dataset',
    professor: { provider: 'deepseek', model: 'deepseek-reasoner', maxTokens: 2048, temperature: 0.7, apiKey: '' },
    method: 'reasoning-r1',
    samples: [
      { id: 's1', prompt: 'What is 2+2?', completion: '4', professorModel: 'deepseek-reasoner', verified: true, metadata: {} },
      { id: 's2', prompt: 'What is 3+3?', completion: '6', professorModel: 'deepseek-reasoner', verified: false, metadata: {} },
      { id: 's3', prompt: 'What is 4+4?', completion: '8', professorModel: 'deepseek-reasoner', verified: true, metadata: {} },
    ],
    totalTokens: 100, estimatedCost: 0.001,
    quality: { verifiedRatio: 0.66, avgLength: 5, diversityScore: 0.5 },
  }

  beforeEach(() => {
    exporter = new DatasetExporter()
  })

  it('should create instance', () => {
    expect(exporter).toBeInstanceOf(DatasetExporter)
  })

  it('should export to JSONL SFT format', async () => {
    const results = await exporter.export(sampleDataset, {
      format: 'jsonl-sft', outputDir: '.ai/distillation-test',
    })
    expect(results.length).toBe(1)
    expect(results[0].format).toBe('jsonl-sft')
    expect(results[0].samples).toBe(3)
  })

  it('should export to ShareGPT format', async () => {
    const results = await exporter.export(sampleDataset, {
      format: 'sharegpt', outputDir: '.ai/distillation-test',
    })
    expect(results.length).toBe(1)
    expect(results[0].format).toBe('sharegpt')
  })

  it('should export to Alpaca format', async () => {
    const results = await exporter.export(sampleDataset, {
      format: 'alpaca', outputDir: '.ai/distillation-test',
    })
    expect(results.length).toBe(1)
    expect(results[0].format).toBe('alpaca')
  })

  it('should split train/valid when configured', async () => {
    const results = await exporter.export(sampleDataset, {
      format: 'jsonl-sft', outputDir: '.ai/distillation-test', split: true, validRatio: 0.3,
    })
    expect(results.length).toBeGreaterThanOrEqual(1)
  })

  it('should get dataset stats', async () => {
    const stats = await exporter.getDatasetStats(sampleDataset)
    expect(stats.totalSamples).toBe(3)
    expect(stats.verifiedRatio).toBe(2 / 3)
    expect(stats.estimatedCost).toBe(0.001)
  })

  it('should load prompts from JSONL', async () => {
    const fs = await import('fs/promises')
    const tmpPath = '.ai/distillation-test-prompts.jsonl'
    await fs.mkdir('.ai', { recursive: true })
    await fs.writeFile(tmpPath, '{"prompt": "test1"}\n{"prompt": "test2"}', 'utf-8')
    const prompts = await exporter.loadPromptsFromFile(tmpPath)
    expect(prompts).toEqual(['test1', 'test2'])
    await fs.unlink(tmpPath).catch(() => {})
  })
})

describe('ReasoningDataGenerator', () => {
  let generator: ReasoningDataGenerator

  beforeEach(() => {
    generator = new ReasoningDataGenerator()
  })

  it('should create instance', () => {
    expect(generator).toBeInstanceOf(ReasoningDataGenerator)
  })

  it('should generate dataset from prompts', async () => {
    const dataset = await generator.generate({
      professor: { provider: 'deepseek', model: 'deepseek-reasoner', maxTokens: 1024, temperature: 0.7, apiKey: '' },
      prompts: ['What is 2+2?', 'What is 3+3?'],
      maxTokens: 1024,
      method: 'reasoning-r1',
      useR1Template: false,
    })
    expect(dataset.samples.length).toBeGreaterThan(0)
    expect(dataset.id).toBeTruthy()
    expect(dataset.method).toBe('reasoning-r1')
  })

  it('should compute diversity score', async () => {
    const dataset = await generator.generate({
      professor: { provider: 'deepseek', model: 'deepseek-reasoner', maxTokens: 1024, temperature: 0.7, apiKey: '' },
      prompts: ['Question 1', 'Question 2', 'Question 3'],
      maxTokens: 1024,
      method: 'logit',
    })
    expect(dataset.quality.diversityScore).toBeGreaterThanOrEqual(0)
  })
})

describe('ProfessorApiProvider', () => {
  let provider: ProfessorApiProvider

  beforeEach(() => {
    provider = new ProfessorApiProvider()
  })

  it('should create instance', () => {
    expect(provider).toBeInstanceOf(ProfessorApiProvider)
  })

  it('should handle missing API key gracefully', async () => {
    const result = await provider.generate('Test prompt', {
      provider: 'openai', model: 'o3', maxTokens: 512, temperature: 0.7,
    })
    expect(result.sample).toBeTruthy()
    expect(result.sample.completion).toContain('ERROR')
  })

  it('should return mock data for unknown provider', async () => {
    const result = await provider.generate('Test', {
      provider: 'google' as 'anthropic', model: 'gemini', maxTokens: 512, temperature: 0.7,
    })
    expect(result.sample.completion).toContain('Reasoning chain')
    expect(result.cost).toBe(0)
  })

  it('should include cost and duration in result', async () => {
    const result = await provider.generate('Test', {
      provider: 'deepseek', model: 'deepseek-reasoner', maxTokens: 512, temperature: 0.7,
    })
    expect(result).toHaveProperty('cost')
    expect(result).toHaveProperty('durationMs')
    expect(typeof result.cost).toBe('number')
    expect(typeof result.durationMs).toBe('number')
  })
})
