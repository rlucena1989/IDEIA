import { createLogger } from '@ideia/logger'
import { DeployPipeline, DeployTarget, DeployResult, DeployArtifact, DeployStage } from './types'

const logger = createLogger('deploy-pipeline')

export class DeployPipelineRunner {
  private pipelines = new Map<string, any>()
  private artifacts: DeployArtifact[] = []

  createPipeline(stages?: DeployStage[]): any {
    const allStages = stages ?? ['init', 'build', 'test', 'package', 'deploy', 'verify'] as any
    const pipeline: any = { id: `pipe-${Date.now()}`, stages: allStages, currentStage: allStages[0] as any, status: 'pending' as any, startedAt: new Date().toISOString() }
    this.pipelines.set(pipeline.id, pipeline)
    logger.info(`Pipeline created`, { id: pipeline.id, stages: allStages.length })
    return pipeline
  }

  async run(pipelineId: string, artifact: DeployArtifact, target: any): Promise<any> {
    const pipeline = this.pipelines.get(pipelineId)
    if (!pipeline) throw new Error(`Pipeline ${pipelineId} not found`)
    const start = Date.now()
    const logs: string[] = []

    pipeline.status = 'running' as any
    for (const stage of pipeline.stages) {
      pipeline.currentStage = stage as any
      logs.push(`[${stage}] Starting...`)
      await this.simulateStage(stage)
      logs.push(`[${stage}] Complete`)
    }

    pipeline.status = 'passed' as any
    pipeline.completedAt = new Date().toISOString()
    this.artifacts.push(artifact)

    logger.info(`Deploy complete`, { pipelineId, duration: Date.now() - start, target: target.environment })
    return { pipelineId, success: true, artifact, target, durationMs: Date.now() - start, logs }
  }

  async rollback(pipelineId: string): Promise<any> {
    const pipeline = this.pipelines.get(pipelineId)
    if (!pipeline) throw new Error(`Pipeline ${pipelineId} not found`)
    pipeline.status = 'rolled-back'
    logger.info(`Pipeline rolled back`, { pipelineId })
    return { pipelineId, success: false, artifact: { name: 'rollback', version: '1.0', type: 'docker', hash: '', size: 0 }, target: { environment: 'rollback', url: '', strategy: 'rolling', healthEndpoint: '' }, durationMs: 0, logs: ['Rollback executed'] }
  }

  getArtifacts(): DeployArtifact[] { return [...this.artifacts] }

  private async simulateStage(_stage: DeployStage): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, 1))
  }
}
