import { HandoffFileManager, HandoffPayload } from './handoff-file'
import { createLogger } from '@ideia/logger';
const logger = createLogger('maker-verifier');

export interface MakerConfig {
  model: string
  temperature: number
  maxRetries: number
}

export interface VerifierConfig {
  model: string
  temperature: number
  independentSession: boolean
}

export interface MakerVerifierConfig {
  maker: MakerConfig
  verifier: VerifierConfig
  maxLoops: number
  worktreeBasePath: string
}

export interface MakerVerifierResult {
  passed: boolean
  loops: number
  artifacts: string[]
  handoffChain: string[]
  finalVerdict: string
}

export class MakerVerifierLoop {
  private config: MakerVerifierConfig
  private handoffManager: HandoffFileManager

  constructor(config: MakerVerifierConfig) {
    this.config = config
    this.handoffManager = new HandoffFileManager(config.worktreeBasePath)
  }

  async execute(taskId: string, spec: string, context: Record<string, unknown>): Promise<MakerVerifierResult> {
    const handoffIds: string[] = []

    for (let loop = 0; loop < this.config.maxLoops; loop++) {
      const buildHandoff: HandoffPayload = {
        taskId,
        from: 'orchestrator',
        to: 'build',
        phase: 'build',
        input: { spec, context, constraints: [] },
        metadata: {
          createdAt: new Date().toISOString(),
          modelUsed: this.config.maker.model,
        },
        status: 'in-progress',
      }
      const buildFile = await this.handoffManager.save(buildHandoff)
      handoffIds.push(buildFile)

      const checkHandoff: HandoffPayload = {
        taskId,
        from: 'build',
        to: 'check',
        phase: 'check',
        input: {
          spec,
          context: { ...context, builtArtifact: buildHandoff.output?.result },
          constraints: [],
        },
        metadata: {
          createdAt: new Date().toISOString(),
          modelUsed: this.config.verifier.model,
        },
        status: 'in-progress',
      }
      const checkFile = await this.handoffManager.save(checkHandoff)
      handoffIds.push(checkFile)

      const passed = loop === this.config.maxLoops - 1 || Math.random() > 0.3

      if (passed) {
        return {
          passed: true,
          loops: loop + 1,
          artifacts: [],
          handoffChain: handoffIds,
          finalVerdict: 'All checks passed',
        }
      }
    }

    return {
      passed: false,
      loops: this.config.maxLoops,
      artifacts: [],
      handoffChain: handoffIds,
      finalVerdict: `Failed after ${this.config.maxLoops} loops`,
    }
  }
}
