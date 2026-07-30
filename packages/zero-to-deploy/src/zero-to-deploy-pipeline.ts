import * as crypto from 'crypto'
import { createLogger } from '@ideia/logger'
import {
  WorkflowPhase, WorkflowState, AutonomyLevel,
  Specification, Architecture, Artifact, DeployReport,
} from './types'

const log = createLogger('zero-to-deploy')

export interface PhaseContext {
  input?: string
  specification?: Specification
  architecture?: Architecture
  sourcePath?: string
  artifact?: Artifact
  deployReport?: DeployReport
}

export interface PhaseExecutor {
  execute(context: PhaseContext): Promise<Partial<PhaseContext>>
}

const STATE_TRANSITIONS: Record<WorkflowState, WorkflowState[]> = {
  entry: ['requirements'],
  requirements: ['architecture', 'req_failed', 'cancelled'],
  req_failed: ['req_retry', 'cancelled'],
  req_retry: ['requirements'],
  architecture: ['implement', 'arch_failed', 'cancelled'],
  arch_failed: ['arch_retry', 'cancelled'],
  arch_retry: ['architecture'],
  implement: ['testing', 'impl_failed', 'cancelled'],
  impl_failed: ['impl_retry', 'cancelled'],
  impl_retry: ['implement'],
  testing: ['build', 'tst_failed', 'cancelled'],
  tst_failed: ['tst_fix', 'cancelled'],
  tst_fix: ['implement'],
  build: ['deploy', 'bld_failed', 'cancelled'],
  bld_failed: ['bld_retry', 'cancelled'],
  bld_retry: ['build'],
  deploy: ['verify', 'dpl_failed', 'cancelled'],
  dpl_failed: ['dpl_retry', 'cancelled'],
  dpl_retry: ['deploy'],
  verify: ['completed', 'vrf_failed'],
  vrf_failed: ['vrf_retry'],
  vrf_retry: ['deploy'],
  completed: [],
  cancelled: [],
}

export class ZeroToDeployPipeline {
  private _id: string
  private _state: WorkflowState = 'entry'
  private _attempt: number = 0
  private _context: PhaseContext = {}
  private _maxRetries: number
  private _autonomyLevel: AutonomyLevel
  private _phaseExecutors: Map<WorkflowPhase, PhaseExecutor> = new Map()

  constructor(
    public readonly description: string,
    config?: { maxRetries?: number; autonomyLevel?: AutonomyLevel },
  ) {
    this._id = `wf_${crypto.randomUUID().slice(0, 8)}`
    this._maxRetries = config?.maxRetries ?? 3
    this._autonomyLevel = config?.autonomyLevel ?? 2
  }

  get id(): string { return this._id }
  get state(): WorkflowState { return this._state }
  get context(): PhaseContext { return this._context }
  get autonomyLevel(): AutonomyLevel { return this._autonomyLevel }

  registerPhase(phase: WorkflowPhase, executor: PhaseExecutor): void {
    this._phaseExecutors.set(phase, executor)
  }

  canTransition(to: WorkflowState): boolean {
    const allowed = STATE_TRANSITIONS[this._state]
    return allowed ? allowed.includes(to) : false
  }

  transition(to: WorkflowState): void {
    if (!this.canTransition(to)) {
      throw new Error(`Invalid transition: ${this._state} -> ${to}`)
    }
    log.info(`Transition: ${this._state} -> ${to}`)
    this._state = to
  }

  needsHumanApproval(phase: WorkflowPhase): boolean {
    const matrix: Record<AutonomyLevel, WorkflowPhase[]> = {
      0: ['requirements', 'architecture', 'implement', 'testing', 'build', 'deploy'],
      1: ['requirements', 'architecture', 'deploy'],
      2: ['architecture', 'deploy'],
      3: ['deploy'],
      4: [],
    }
    return (matrix[this._autonomyLevel] || []).includes(phase)
  }

  async start(description: string): Promise<void> {
    log.info(`Workflow ${this._id} started: "${description}"`)
    this._state = 'requirements'
  }

  async executePhase(phase: WorkflowPhase): Promise<void> {
    const executor = this._phaseExecutors.get(phase)
    if (!executor) throw new Error(`No executor for phase ${phase}`)
    this._attempt++
    log.info(`Executing phase ${phase} (attempt ${this._attempt})`)
    try {
      const result = await executor.execute(this._context)
      this._context = { ...this._context, ...result }
    } catch (error: any) {
      log.error(`Phase ${phase} failed: ${error.message}`)
      throw error
    }
  }

  getFailedState(phase: WorkflowPhase): WorkflowState {
    const map: Record<WorkflowPhase, WorkflowState> = {
      requirements: 'req_failed',
      architecture: 'arch_failed',
      implement: 'impl_failed',
      testing: 'tst_failed',
      build: 'bld_failed',
      deploy: 'dpl_failed',
      verify: 'vrf_failed',
    }
    return map[phase]
  }

  getNextState(phase: WorkflowPhase): WorkflowState {
    const map: Record<WorkflowPhase, WorkflowState> = {
      requirements: 'architecture',
      architecture: 'implement',
      implement: 'testing',
      testing: 'build',
      build: 'deploy',
      deploy: 'verify',
      verify: 'completed',
    }
    return map[phase]
  }
}
