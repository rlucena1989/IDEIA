import { AgentOrchestrator } from './agent-orchestrator'
import { createLogger } from '@ideia/logger';
import { ExecutableStep } from './agent-runtime'
import { HandoffFileManager, HandoffPayload } from './handoff-file'
import { MakerVerifierLoop, MakerVerifierConfig } from './maker-verifier'
const logger = createLogger('spec-pipeline');

export interface SpecPipelineInput {
  specId: string
  title: string
  tasks: SpecTask[]
  acceptanceCriteria: string[]
  steeringFiles: string[]
}

export interface SpecTask {
  id: string
  title: string
  description: string
  dependencies: string[]
  acceptanceCriteria: string[]
}

export interface SpecPipelineResult {
  specId: string
  phases: Array<{ name: string; status: string; durationMs: number; output?: unknown }>
  passed: boolean
  totalDurationMs: number
  handoffChain: string[]
}

export class SpecDrivenPipeline {
  private orchestrator: AgentOrchestrator
  private handoff: HandoffFileManager
  private makerVerifier: MakerVerifierLoop

  constructor(orchestrator: AgentOrchestrator, basePath: string) {
    this.orchestrator = orchestrator
    this.handoff = new HandoffFileManager(basePath)
    this.makerVerifier = new MakerVerifierLoop({
      maker: { model: 'sonnet', temperature: 0.3, maxRetries: 3 },
      verifier: { model: 'haiku', temperature: 0.1, independentSession: true },
      maxLoops: 3,
      worktreeBasePath: basePath,
    })
  }

  async execute(input: SpecPipelineInput): Promise<SpecPipelineResult> {
    const phases: SpecPipelineResult['phases'] = []
    const start = Date.now()
    const handoffIds: string[] = []

    // Phase 1: Planning
    const planStart = Date.now()
    const planPayload: HandoffPayload = {
      taskId: input.specId, from: 'orchestrator', to: 'analyst',
      phase: 'orchestrator',
      input: { spec: input.title, context: { tasks: input.tasks }, constraints: [] },
      metadata: { createdAt: new Date().toISOString() },
      status: 'pending',
    }
    const planFile = await this.handoff.save(planPayload)
    handoffIds.push(planFile)
    phases.push({ name: 'plan', status: 'passed', durationMs: Date.now() - planStart })

    // Phase 2: Execute each task
    for (const task of input.tasks) {
      const execStart = Date.now()
      const execPayload: HandoffPayload = {
        taskId: task.id, from: 'orchestrator', to: 'build',
        phase: 'build',
        input: {
          spec: task.title,
          context: { description: task.description, criteria: task.acceptanceCriteria },
          constraints: [],
        },
        metadata: { createdAt: new Date().toISOString() },
        status: 'in-progress',
      }
      const execFile = await this.handoff.save(execPayload)
      handoffIds.push(execFile)

      await this.orchestrator.runPipeline(task.description)

      execPayload.status = 'completed'
      execPayload.metadata.completedAt = new Date().toISOString()
      await this.handoff.save(execPayload)

      phases.push({ name: `exec:${task.id}`, status: 'passed', durationMs: Date.now() - execStart })
    }

    // Phase 3: Verify with MakerVerifier
    const verifyStart = Date.now()
    const mvResult = await this.makerVerifier.execute(
      input.specId,
      JSON.stringify(input.acceptanceCriteria),
      { tasks: input.tasks },
    )
    handoffIds.push(...mvResult.handoffChain)
    phases.push({ name: 'verify', status: mvResult.passed ? 'passed' : 'failed', durationMs: Date.now() - verifyStart })

    // Phase 4: Integration check
    const integStart = Date.now()
    const integPayload: HandoffPayload = {
      taskId: input.specId, from: 'check', to: 'orchestrator',
      phase: 'check',
      input: {
        spec: input.title,
        context: { phases: phases.map(p => p.name) },
        constraints: [],
      },
      metadata: { createdAt: new Date().toISOString(), completedAt: new Date().toISOString() },
      status: mvResult.passed ? 'completed' : 'failed',
    }
    const integFile = await this.handoff.save(integPayload)
    handoffIds.push(integFile)

    if (mvResult.passed) {
      phases.push({ name: 'integration', status: 'passed', durationMs: Date.now() - integStart })
    } else {
      phases.push({ name: 'integration', status: 'skipped', durationMs: Date.now() - integStart })
    }

    return {
      specId: input.specId,
      phases,
      passed: mvResult.passed,
      totalDurationMs: Date.now() - start,
      handoffChain: handoffIds,
    }
  }
}
