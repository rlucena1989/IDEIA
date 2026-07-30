import { TrainingConnector } from '../src/training-connector'
import type { TrainingBackend } from '../src/training-connector'

describe('TrainingConnector', () => {
  let connector: TrainingConnector

  beforeEach(() => {
    connector = new TrainingConnector()
  })

  it('should create instance', () => {
    expect(connector).toBeInstanceOf(TrainingConnector)
  })

  it('should detect backends', async () => {
    const backends: TrainingBackend[] = await connector.detectBackends()
    expect(backends.length).toBeGreaterThan(0)
    expect(backends.some((b: TrainingBackend) => b.type === 'huggingface')).toBe(true)
    expect(backends.some((b: TrainingBackend) => b.type === 'unsloth')).toBe(true)
    expect(backends.some((b: TrainingBackend) => b.type === 'mlx')).toBe(true)
    backends.forEach((b: TrainingBackend) => {
      expect(b).toHaveProperty('name')
      expect(b).toHaveProperty('type')
      expect(b).toHaveProperty('available')
    })
  })

  it('should run training and report failure gracefully without backends', async () => {
    const result = await connector.runTraining(
      {
        id: 'test-1', baseModel: 'Qwen2.5-7B', dataset: '/tmp/test.jsonl',
        peftConfig: { method: 'lora', rank: 8, alpha: 16, dropout: 0.1, targetModules: ['q_proj'] },
        hyperparameters: { learningRate: 2e-4, batchSize: 4, epochs: 1, gradientAccumulationSteps: 4, bf16: false, warmupRatio: 0.03, maxSeqLength: 2048 },
        status: 'pending' as const, progress: 0,
      },
      '/tmp/test.jsonl', '/tmp/adapters',
    )
    expect(result).toHaveProperty('success')
    expect(typeof result.success).toBe('boolean')
  })

  it('should select HuggingFace backend when available', () => {
    const backends: TrainingBackend[] = [
      { name: 'HF', type: 'huggingface', available: true, requiresGpu: true },
      { name: 'MLX', type: 'mlx', available: false, requiresGpu: false },
    ]
    const selected = connector.selectBackend(backends, 'lora')
    expect(selected?.type).toBe('huggingface')
  })

  it('should prefer Unsloth for QLoRA', () => {
    const backends: TrainingBackend[] = [
      { name: 'HF', type: 'huggingface', available: true, requiresGpu: true },
      { name: 'Unsloth', type: 'unsloth', available: true, requiresGpu: true },
    ]
    const selected = connector.selectBackend(backends, 'qlora')
    expect(selected?.type).toBe('unsloth')
  })

  it('should return null when no backends available', () => {
    const backends: TrainingBackend[] = [
      { name: 'HF', type: 'huggingface', available: false, requiresGpu: true },
    ]
    expect(connector.selectBackend(backends, 'lora')).toBeNull()
  })

  it('should generate HuggingFace PEFT training script', () => {
    const script = connector.generateHuggingFaceScript(
      'Qwen2.5-7B', '/tmp/data.jsonl', '/tmp/out', 'lora',
      { learningRate: 2e-4, batchSize: 4, epochs: 3, gradientAccumulationSteps: 4, bf16: false, warmupRatio: 0.03, maxSeqLength: 2048 },
      { method: 'lora', rank: 16, alpha: 32, dropout: 0.05, targetModules: ['q_proj'] },
      undefined,
    )
    expect(script).toContain('AutoModelForCausalLM')
    expect(script).toContain('LoraConfig')
    expect(script).toContain('r=16')
    expect(script).toContain('lora_alpha=32')
    expect(script).toContain('per_device_train_batch_size=4')
    expect(script).toContain('num_train_epochs=3')
  })

  it('should generate Unsloth training script for QLoRA', () => {
    const script = connector.generateUnslothScript(
      'Qwen2.5-7B', '/tmp/data.jsonl', '/tmp/out', 'qlora',
      { learningRate: 2e-4, batchSize: 1, epochs: 1, gradientAccumulationSteps: 4, bf16: true, warmupRatio: 0.03, maxSeqLength: 2048 },
      8, 16, 0.1,
      { type: 'nf4', computeDtype: 'bfloat16', doubleQuant: true },
    )
    expect(script).toContain('FastLanguageModel')
    expect(script).toContain('load_in_4bit=True')
    expect(script).toContain('SFTTrainer')
  })

  it('should generate HF script with BitsAndBytes for quantization', () => {
    const script = connector.generateHuggingFaceScript(
      'Qwen2.5-7B', '/tmp/data.jsonl', '/tmp/out', 'qlora',
      { learningRate: 2e-4, batchSize: 2, epochs: 2, gradientAccumulationSteps: 4, bf16: true, warmupRatio: 0.03, maxSeqLength: 2048 },
      { method: 'qlora', rank: 8, alpha: 16, dropout: 0.1, targetModules: ['q_proj'], quantization: { type: 'nf4', computeDtype: 'bfloat16', doubleQuant: true } },
      { type: 'nf4', computeDtype: 'bfloat16', doubleQuant: true },
    )
    expect(script).toContain('BitsAndBytesConfig')
    expect(script).toContain('load_in_4bit=true')
    expect(script).toContain('quantization_config=bnb_config')
  })

  it('should parse training output with metrics', () => {
    const output = 'step 1/100 loss=0.5\nstep 2/100 loss=0.3\nMETRICS: {"trainLoss":[0.5,0.3,0.2],"evalLoss":[0.6,0.4],"perplexity":1.65}\nOK: complete'
    const result = connector.parseTrainingOutput(output)
    expect(result).not.toBeNull()
    expect(result!.trainLoss).toEqual([0.5, 0.3, 0.2])
    expect(result!.evalLoss).toEqual([0.6, 0.4])
    expect(result!.perplexity).toBe(1.65)
  })

  it('should return null for output without metrics', () => {
    expect(connector.parseTrainingOutput('no metrics here')).toBeNull()
  })

  it('should handle merge adapter gracefully without backend', async () => {
    const result = await connector.mergeAdapter('Qwen2.5-7B', '/tmp/adapter', '/tmp/merged')
    expect(result).toBe(false)
  })

  it('should handle evaluate gracefully without backend', async () => {
    const result = await connector.evaluateModel('Qwen2.5-7B', '/tmp/test.jsonl')
    expect(result).toEqual({ perplexity: 0, loss: 0 })
  })

  it('should detect python packages', async () => {
    const torchAvailable = await connector.checkPythonPackage('sys')
    expect(torchAvailable).toBe(true)
    const nonexistent = await connector.checkPythonPackage('nonexistent_package_xyz')
    expect(nonexistent).toBe(false)
  })
})
