import { PEFTExecutor, PEFTConfig, TrainingHyperparameters, TrainingRun } from './peft-executor'
import { createLogger } from '@ideia/logger'
import * as fsp from 'fs/promises'
import * as path from 'path'

const logger = createLogger('finetuning-pipeline:continuous')

export interface DriftSignal {
  type: 'new-pattern' | 'error-rate' | 'domain-shift' | 'user-feedback'
  detectedAt: string
  confidence: number
  description: string
  affectedFiles: string[]
}

export interface ContinuousFTConfig {
  projectRoot: string
  baseModel: string
  checkIntervalMs: number
  minSamplesForDrift: number
  autoTrain: boolean
  peftConfig: PEFTConfig
  hyperparameters: TrainingHyperparameters
}

export class ContinuousFinetuning {
  private executor: PEFTExecutor
  private config: ContinuousFTConfig
  private lastCheck: string = ''
  private adaptersCreated: number = 0

  constructor(executor: PEFTExecutor, config: Partial<ContinuousFTConfig>) {
    this.executor = executor
    this.config = {
      projectRoot: config.projectRoot || '.',
      baseModel: config.baseModel || 'Qwen2.5-7B',
      checkIntervalMs: config.checkIntervalMs || 3600000,
      minSamplesForDrift: config.minSamplesForDrift || 50,
      autoTrain: config.autoTrain ?? true,
      peftConfig: config.peftConfig || {
        method: 'qlora',
        rank: 16,
        alpha: 32,
        dropout: 0.05,
        targetModules: ['q_proj', 'k_proj', 'v_proj', 'o_proj', 'gate_proj', 'up_proj', 'down_proj'],
      },
      hyperparameters: config.hyperparameters || {
        learningRate: 2e-4,
        batchSize: 4,
        epochs: 3,
        gradientAccumulationSteps: 8,
        bf16: true,
        warmupRatio: 0.1,
        maxSeqLength: 2048,
      },
    }
  }

  async detectDrift(): Promise<DriftSignal[]> {
    const signals: DriftSignal[] = []

    const gitLog = await this.getRecentGitLog()
    if (gitLog.length > this.config.minSamplesForDrift) {
      signals.push({
        type: 'new-pattern',
        detectedAt: new Date().toISOString(),
        confidence: 0.6,
        description: `${gitLog.length} new commits since last check`,
        affectedFiles: gitLog.slice(0, 20),
      })
    }

    const testChanges = await this.detectTestPatternChanges()
    if (testChanges) {
      signals.push(testChanges)
    }

    return signals
  }

  async checkAndTrain(): Promise<TrainingRun | null> {
    const signals = await this.detectDrift()
    if (signals.length === 0) {
      logger.info('No drift detected — skipping training')
      return null
    }

    const avgConfidence = signals.reduce((acc, s) => acc + s.confidence, 0) / signals.length
    logger.info('Drift detected', { signals: signals.length, avgConfidence })

    if (!this.config.autoTrain) {
      logger.info('Auto-train disabled — run `ideia finetune adapt` manually')
      return null
    }

    const run = await this.executor.prepare({
      baseModel: this.config.baseModel,
      dataset: await this.collectTrainingData(signals),
      peftConfig: this.config.peftConfig,
      hyperparameters: this.config.hyperparameters,
    })

    const completed = await this.executor.execute(run.id)
    this.adaptersCreated++
    this.lastCheck = new Date().toISOString()

    logger.info('Continuous training completed', {
      adapterId: completed.id,
      perplexity: completed.metrics?.perplexity,
      adaptersCreated: this.adaptersCreated,
    })

    return completed
  }

  private async getRecentGitLog(): Promise<string[]> {
    try {
      const { execSync } = await import('child_process')
      const output = execSync('git log --oneline -100', {
        cwd: this.config.projectRoot,
        encoding: 'utf-8',
        timeout: 10000,
      })
      return output.trim().split('\n').filter(Boolean)
    } catch {
      return []
    }
  }

  private async detectTestPatternChanges(): Promise<DriftSignal | null> {
    try {
      const testDir = path.join(this.config.projectRoot, '__tests__')
      await fsp.access(testDir)
      const files = await fsp.readdir(testDir)
      const recent = files.filter(f => f.endsWith('.ts')).slice(0, 10)
      if (recent.length > 5) {
        return {
          type: 'domain-shift',
          detectedAt: new Date().toISOString(),
          confidence: 0.5,
          description: `${recent.length} test files in project — domain patterns may have shifted`,
          affectedFiles: recent.map(f => `__tests__/${f}`),
        }
      }
    } catch { /* no test dir */ }
    return null
  }

  private async collectTrainingData(signals: DriftSignal[]): Promise<string> {
    const dataPath = path.join(this.config.projectRoot, '.ai', 'finetune-data.jsonl')
    const entries = signals.flatMap(s => s.affectedFiles.map(f => ({
      prompt: `Analyze code change in ${f}`,
      completion: `Recent change detected: ${s.description} (confidence: ${s.confidence})`,
    })))
    await fsp.mkdir(path.dirname(dataPath), { recursive: true })
    await fsp.writeFile(dataPath, entries.map(e => JSON.stringify(e)).join('\n'), 'utf-8')
    return dataPath
  }

  getStats(): { adaptersCreated: number; lastCheck: string } {
    return { adaptersCreated: this.adaptersCreated, lastCheck: this.lastCheck }
  }
}
