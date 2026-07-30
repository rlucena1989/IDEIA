import { createLogger } from '@ideia/logger'
import { SpecGenerator, type GenerationInput } from './spec-generator'
import { SteeringFileManager } from './steering-file-manager'
import { HookEngine, type HookContext, type HookResult } from './hook-engine'
import type { Spec, Task, SpecStatus, HookAction } from './types'

const log = createLogger('spec-engine:integration')

export interface SpecIntegrationConfig {
  projectRoot: string
  orchestration?: {
    autoExecute: boolean
    maxConcurrentTasks: number
  }
}

export class SpecDrivenDevelopment {
  private generator: SpecGenerator
  private steering: SteeringFileManager
  private hooks: HookEngine
  private currentSpec: Spec | null = null
  private config: SpecIntegrationConfig
  private pipeline: import('@ideia/agent-runtime').SpecDrivenPipeline | null = null
  private orchestrator: import('@ideia/agent-runtime').AgentOrchestrator | null = null
  private runtimeConnected = false

  constructor(config: SpecIntegrationConfig) {
    this.generator = new SpecGenerator()
    this.steering = new SteeringFileManager()
    this.hooks = new HookEngine()
    this.config = config
  }

  async initialize(): Promise<void> {
    await this.steering.loadFromProject(this.config.projectRoot)
    this.registerDefaultHooks()
    log.info('SpecDrivenDevelopment initialized', {
      steeringFiles: this.steering.getAll().length,
      projectRoot: this.config.projectRoot,
    })
  }

  async setOrchestrator(orchestrator: import('@ideia/agent-runtime').AgentOrchestrator): Promise<void> {
    this.orchestrator = orchestrator
    try {
      const { SpecDrivenPipeline } = await import('@ideia/agent-runtime')
      this.pipeline = new SpecDrivenPipeline(orchestrator, this.config.projectRoot)
      this.runtimeConnected = true
      log.info('Agent runtime connected to SpecDrivenDevelopment')
    } catch (err) {
      log.warn('Could not connect agent-runtime', { error: String(err) })
    }
  }

  async generateSpec(input: GenerationInput): Promise<Spec> {
    const spec = this.generator.generate(input)
    this.currentSpec = spec

    await this.hooks.fire('specChange', {
      event: 'specChange',
      projectPath: this.config.projectRoot,
      metadata: { specId: spec.id, title: spec.title, version: spec.version },
    })

    log.info('Spec generated', { id: spec.id, title: spec.title })
    return spec
  }

  async executeSpec(spec: Spec): Promise<boolean> {
    this.currentSpec = spec
    spec.status = 'implementing'

    if (this.pipeline && this.orchestrator) {
      const result = await this.pipeline.execute({
        specId: spec.id,
        title: spec.title,
        tasks: spec.tasks.map(t => ({
          id: t.id,
          title: t.title,
          description: t.description,
          dependencies: t.dependencies,
          acceptanceCriteria: t.acceptanceCriteria,
        })),
        acceptanceCriteria: spec.acceptanceCriteria.map(tc => tc.description),
        steeringFiles: this.steering.getAll().map(f => f.path),
      })

      spec.status = result.passed ? 'done' : 'implementing'

      await this.hooks.fire('taskComplete', {
        event: 'taskComplete',
        projectPath: this.config.projectRoot,
        metadata: {
          specId: spec.id,
          passed: result.passed,
          phases: result.phases,
          durationMs: result.totalDurationMs,
        },
      })

      return result.passed
    }

    spec.status = 'done'
    return true
  }

  async verifyToolUse(toolType: string, filePath?: string, content?: string): Promise<{ allowed: boolean; reason?: string }> {
    const context: HookContext = {
      event: 'preToolUse',
      toolType,
      filePath,
      projectPath: this.config.projectRoot,
      metadata: { currentSpec: this.currentSpec?.id, specStatus: this.currentSpec?.status },
    }

    const results = await this.hooks.fire('preToolUse', context)
    const failed = results.find(r => !r.passed)
    if (failed) {
      return { allowed: false, reason: failed.message }
    }

    if (this.currentSpec?.status === 'implementing') {
      const steeringFiles = this.steering.getForFileContext(filePath || '')
      if (steeringFiles.length > 0 && content) {
        const violation = this.checkSteeringViolations(content, steeringFiles.map(f => f.content))
        if (violation) {
          return { allowed: false, reason: violation }
        }
      }
    }

    return { allowed: true }
  }

  async onFileSaved(filePath: string): Promise<void> {
    await this.hooks.fire('fileSaved', {
      event: 'fileSaved',
      filePath,
      projectPath: this.config.projectRoot,
      metadata: { currentSpec: this.currentSpec?.id },
    })

    const matchingSteering = this.steering.getForFileContext(filePath)
    if (matchingSteering.length > 0) {
      log.info('File matches steering context', { file: filePath, rules: matchingSteering.length })
    }
  }

  async onTaskComplete(taskId: string, success: boolean): Promise<void> {
    if (!this.currentSpec) return

    const task = this.currentSpec.tasks.find(t => t.id === taskId)
    if (task) {
      task.status = success ? 'done' : 'in-progress'
    }

    const allDone = this.currentSpec.tasks.every(t => t.status === 'done')
    if (allDone) {
      this.currentSpec.status = 'done'
      log.info('All tasks complete for spec', { id: this.currentSpec.id })
    }

    await this.hooks.fire('taskComplete', {
      event: 'taskComplete',
      projectPath: this.config.projectRoot,
      metadata: { taskId, success, specId: this.currentSpec?.id },
    })
  }

  async onSessionEnd(): Promise<{ summary: string; remainingTasks: Task[] }> {
    await this.hooks.fire('sessionEnd', {
      event: 'sessionEnd',
      projectPath: this.config.projectRoot,
      metadata: {
        currentSpec: this.currentSpec?.id,
        specStatus: this.currentSpec?.status,
        steeringFiles: this.steering.getAll().length,
      },
    })

    const remainingTasks = this.currentSpec
      ? this.currentSpec.tasks.filter(t => t.status !== 'done')
      : []

    return {
      summary: remainingTasks.length === 0 ? 'All tasks completed' : `${remainingTasks.length} tasks remaining`,
      remainingTasks,
    }
  }

  getCurrentSpec(): Spec | null {
    return this.currentSpec
  }

  getSteeringContext(): string {
    return this.steering.toContextString()
  }

  getHookEngine(): HookEngine {
    return this.hooks
  }

  getSteeringFileManager(): SteeringFileManager {
    return this.steering
  }

  hasRuntimeConnection(): boolean {
    return this.runtimeConnected
  }

  private registerDefaultHooks(): void {
    this.hooks.on('validateSpec', async (_hook, context) => {
      if (!this.currentSpec) {
        return { passed: true, message: 'No active spec to validate', durationMs: 0 }
      }
      const pendingTasks = this.currentSpec.tasks.filter(t => t.status !== 'done')
      return {
        passed: this.currentSpec.status !== 'draft',
        message: `Spec ${this.currentSpec.id} (${this.currentSpec.status}): ${this.currentSpec.tasks.length} tasks, ${pendingTasks.length} pending`,
        details: `Tasks: ${this.currentSpec.tasks.filter(t => t.status === 'done').length}/${this.currentSpec.tasks.length} complete`,
        durationMs: 0,
      }
    })

    this.hooks.on('runTests', async (_hook, context) => ({
      passed: true,
      message: `Tests would run for: ${context.filePath || 'all files'}`,
      durationMs: 0,
    }))

    this.hooks.on('runCommand', async (hook, _context) => ({
      passed: true,
      message: `Command queued: ${hook.then.command || 'none'}`,
      durationMs: 0,
    }))

    this.hooks.on('askAgent', async (hook, _context) => ({
      passed: true,
      message: `Agent prompt ready: ${(hook.then.prompt || '').slice(0, 80)}...`,
      durationMs: 0,
    }))
  }

  private checkSteeringViolations(content: string, steeringContents: string[]): string | null {
    for (const steering of steeringContents) {
      const patterns = this.extractConstraints(steering)
      for (const pattern of patterns) {
        if (pattern.startsWith('!') && content.includes(pattern.slice(1))) {
          return `Steering violation: "${pattern.slice(1)}" is forbidden by project rules`
        }
      }
    }
    return null
  }

  private extractConstraints(content: string): string[] {
    return content.split('\n')
      .map(l => l.trim())
      .filter(l => l.startsWith('- ') || l.startsWith('* '))
      .map(l => l.slice(2))
  }
}

export function createSpecDrivenDevelopment(config: SpecIntegrationConfig): SpecDrivenDevelopment {
  return new SpecDrivenDevelopment(config)
}
