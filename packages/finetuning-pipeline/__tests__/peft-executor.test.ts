import { PEFTExecutor } from '../src/peft-executor'
import { ContinuousFinetuning } from '../src/continuous-finetuning'

describe('PEFTExecutor', () => {
  let executor: PEFTExecutor

  beforeEach(() => {
    executor = new PEFTExecutor()
  })

  it('should prepare a training run', async () => {
    const run = await executor.prepare({
      baseModel: 'Qwen2.5-7B',
      dataset: './test-data.jsonl',
      peftConfig: { method: 'lora', rank: 8, alpha: 16, dropout: 0.05, targetModules: ['q_proj', 'v_proj'] },
      hyperparameters: { learningRate: 2e-4, batchSize: 2, epochs: 1, gradientAccumulationSteps: 1, bf16: false, warmupRatio: 0.1, maxSeqLength: 512 },
    })
    expect(run.id).toBeTruthy()
    expect(run.baseModel).toBe('Qwen2.5-7B')
    expect(run.status).toBe('pending')
  })

  it('should execute training and complete', async () => {
    const run = await executor.prepare({
      baseModel: 'test-model',
      dataset: './data.jsonl',
      peftConfig: { method: 'qlora', rank: 4, alpha: 8, dropout: 0.1, targetModules: ['q_proj'], quantization: { type: 'nf4', computeDtype: 'bfloat16', doubleQuant: true } },
      hyperparameters: { learningRate: 1e-4, batchSize: 1, epochs: 2, gradientAccumulationSteps: 1, bf16: false, warmupRatio: 0.1, maxSeqLength: 256 },
    })
    const completed = await executor.execute(run.id)
    expect(completed.status).toBe('completed')
    expect(completed.metrics).toBeDefined()
    expect(completed.metrics!.trainLoss.length).toBeGreaterThan(0)
    expect(completed.metrics!.perplexity).toBeGreaterThan(0)
  })

  it('should list runs', async () => {
    await executor.prepare({
      baseModel: 'm1', dataset: 'd1',
      peftConfig: { method: 'lora', rank: 4, alpha: 8, dropout: 0, targetModules: ['q'] },
      hyperparameters: { learningRate: 1e-4, batchSize: 1, epochs: 1, gradientAccumulationSteps: 1, bf16: false, warmupRatio: 0, maxSeqLength: 128 },
    })
    await executor.prepare({
      baseModel: 'm2', dataset: 'd2',
      peftConfig: { method: 'lora', rank: 4, alpha: 8, dropout: 0, targetModules: ['q'] },
      hyperparameters: { learningRate: 1e-4, batchSize: 1, epochs: 1, gradientAccumulationSteps: 1, bf16: false, warmupRatio: 0, maxSeqLength: 128 },
    })
    const runs = await executor.listRuns()
    expect(runs.length).toBe(2)
  })

  it('should cancel a pending run', async () => {
    const run = await executor.prepare({
      baseModel: 'test', dataset: 'data',
      peftConfig: { method: 'lora', rank: 4, alpha: 8, dropout: 0, targetModules: ['q'] },
      hyperparameters: { learningRate: 1e-4, batchSize: 1, epochs: 1, gradientAccumulationSteps: 1, bf16: false, warmupRatio: 0, maxSeqLength: 128 },
    })
    await executor.cancel(run.id)
    const cancelled = await executor.getRun(run.id)
    expect(cancelled!.status).toBe('failed')
    expect(cancelled!.error).toBe('Cancelled by user')
  })

  it('should return metrics for completed run', async () => {
    const run = await executor.prepare({
      baseModel: 'test', dataset: 'd',
      peftConfig: { method: 'lora', rank: 4, alpha: 8, dropout: 0, targetModules: ['q'] },
      hyperparameters: { learningRate: 1e-4, batchSize: 1, epochs: 1, gradientAccumulationSteps: 1, bf16: false, warmupRatio: 0, maxSeqLength: 128 },
    })
    await executor.execute(run.id)
    const metrics = await executor.getMetrics(run.id)
    expect(metrics).toBeDefined()
    expect(metrics!.finalLoss).toBeGreaterThan(0)
    expect(metrics!.perplexity).toBeGreaterThan(0)
  })
})

describe('ContinuousFinetuning', () => {
  it('should detect drift from git log', async () => {
    const executor = new PEFTExecutor()
    const monitor = new ContinuousFinetuning(executor, {
      projectRoot: process.cwd(),
      baseModel: 'test',
      checkIntervalMs: 1000,
      minSamplesForDrift: 1,
      autoTrain: false,
    })
    const signals = await monitor.detectDrift()
    expect(Array.isArray(signals)).toBe(true)
  })

  it('should not train when autoTrain is false', async () => {
    const executor = new PEFTExecutor()
    const monitor = new ContinuousFinetuning(executor, {
      projectRoot: process.cwd(),
      baseModel: 'test',
      checkIntervalMs: 1000,
      minSamplesForDrift: 1,
      autoTrain: false,
    })
    const result = await monitor.checkAndTrain()
    expect(result).toBeNull()
  })

  it('should track stats', async () => {
    const executor = new PEFTExecutor()
    const monitor = new ContinuousFinetuning(executor, { projectRoot: '.', baseModel: 'test', checkIntervalMs: 1000, minSamplesForDrift: 1, autoTrain: false })
    const stats = monitor.getStats()
    expect(stats.adaptersCreated).toBe(0)
    expect(typeof stats.lastCheck).toBe('string')
  })
})
