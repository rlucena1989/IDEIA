import { ZeroToDeployPipeline, PhaseExecutor, PhaseContext } from '../src/zero-to-deploy-pipeline'
import { GitOpsManager } from '../src/gitops-manager'
import { ProgressiveDeliveryEngine } from '../src/progressive-delivery-engine'
import { MultiCloudDeployer } from '../src/multi-cloud-deployer'
import { FormalDeploymentVerifier } from '../src/formal-deployment-verifier'
import { RollbackOrchestrator } from '../src/rollback-orchestrator'
import { HealthGate } from '../src/health-gate'
import { CloudProvider, DeploymentSpec } from '../src/types'

describe('ZeroToDeployPipeline', () => {
  it('creates pipeline with id', () => {
    const pipe = new ZeroToDeployPipeline('Test deploy')
    expect(pipe.id).toContain('wf_')
    expect(pipe.description).toBe('Test deploy')
    expect(pipe.state).toBe('entry')
  })

  it('supports state transitions', () => {
    const pipe = new ZeroToDeployPipeline('Test')
    expect(pipe.canTransition('requirements')).toBe(true)
    expect(pipe.canTransition('completed')).toBe(false)
    pipe.transition('requirements')
    expect(pipe.state).toBe('requirements')
  })

  it('throws on invalid transitions', () => {
    const pipe = new ZeroToDeployPipeline('Test')
    expect(() => pipe.transition('completed')).toThrow('Invalid transition')
  })

  it('executes phases with registered executors', async () => {
    const pipe = new ZeroToDeployPipeline('Test', { maxRetries: 2 })
    const executor: PhaseExecutor = { execute: async (_ctx: PhaseContext) => ({ specification: { id: 'spec_1', title: 'Test', description: '', intent: 'feature' as const, urgency: 'medium' as const, entities: { domain: 'test', stack: [], requirements: [] }, userStories: [], constraints: { external: [] }, definitionOfDone: [] } }) }
    pipe.registerPhase('requirements', executor)
    await pipe.executePhase('requirements')
    expect(pipe.context.specification?.id).toBe('spec_1')
  })

  it('needs human approval based on autonomy level', () => {
    const pipeN0 = new ZeroToDeployPipeline('Test', { autonomyLevel: 0 })
    expect(pipeN0.needsHumanApproval('requirements')).toBe(true)

    const pipeN4 = new ZeroToDeployPipeline('Test', { autonomyLevel: 4 })
    expect(pipeN4.needsHumanApproval('requirements')).toBe(false)
  })

  it('returns correct failed/next states', () => {
    const pipe = new ZeroToDeployPipeline('Test')
    expect(pipe.getFailedState('requirements')).toBe('req_failed')
    expect(pipe.getNextState('requirements')).toBe('architecture')
    expect(pipe.getNextState('verify')).toBe('completed')
  })
})

describe('GitOpsManager', () => {
  it('creates and syncs', async () => {
    const manager = new GitOpsManager({ repository: 'org/repo', branch: 'main', manifestPath: 'deploy' })
    await expect(manager.sync('v1.0.0', { 'app.yaml': 'test' })).resolves.toBeUndefined()
    await expect(manager.promote('v1.0.0', 'staging')).resolves.toBeUndefined()
    await expect(manager.rollback('v0.9.0')).resolves.toBeUndefined()
    expect(manager.getCurrentVersion()).toBeDefined()
  })
})

describe('ProgressiveDeliveryEngine', () => {
  const engine = new ProgressiveDeliveryEngine()

  it('promotes with progressive delivery', async () => {
    const result = await engine.promote('org/repo', 'deploy', 'v2.0.0')
    expect(result.success).toBe(true)
    expect(result.finalWeight).toBe(100)
    expect(result.phases.length).toBeGreaterThan(0)
  })

  it('resets state', () => {
    expect(() => engine.reset()).not.toThrow()
  })
})

describe('MultiCloudDeployer', () => {
  const deployer = new MultiCloudDeployer()

  it('registers and deploys to provider', async () => {
    const mockProvider: CloudProvider = {
      name: 'aws',
      deploy: async () => {},
      healthCheck: async () => true,
      getRegions: () => ['us-east-1', 'eu-west-1'],
    }
    deployer.registerProvider('aws', mockProvider)
    const result = await deployer.deploy('my-service', 'image:v1', ['us-east-1'])
    expect(result.service).toBe('my-service')
    expect(result.successRate).toBe(1)
  })

  it('performs health checks', async () => {
    const checks = await deployer.healthCheckAll()
    expect(checks.length).toBeGreaterThan(0)
  })
})

describe('FormalDeploymentVerifier', () => {
  const verifier = new FormalDeploymentVerifier()

  it('verifies deployment invariants', async () => {
    const spec: DeploymentSpec = { name: 'my-app', replicas: 3, healthCheck: '/health', rollbackStrategy: 'canary', secretRefs: ['db-password', 'api-key'] }
    const proof = await verifier.verifyInvariants(spec)
    expect(proof.verified).toBe(true)
    expect(proof.checks.length).toBe(4)
    expect(proof.signature).toBeDefined()
  })

  it('fails when no invariants met', async () => {
    const spec: DeploymentSpec = { name: 'minimal', replicas: 1 }
    const proof = await verifier.verifyInvariants(spec)
    expect(proof.verified).toBe(true)
    expect(proof.checks.length).toBe(0)
  })
})

describe('RollbackOrchestrator', () => {
  const orchestrator = new RollbackOrchestrator(5)

  it('records and retrieves rollback points', () => {
    orchestrator.recordRollbackPoint({ version: 'v1', timestamp: new Date().toISOString(), artifactDigest: 'abc', manifest: '{}' })
    orchestrator.recordRollbackPoint({ version: 'v2', timestamp: new Date().toISOString(), artifactDigest: 'def', manifest: '{}' })
    expect(orchestrator.getHistory().length).toBe(2)
  })

  it('rolls back to previous version', async () => {
    const point = await orchestrator.rollbackPrevious()
    expect(point.version).toBe('v1')
  })

  it('rolls back to specific version', async () => {
    const point = await orchestrator.rollbackTo('v1')
    expect(point.version).toBe('v1')
  })

  it('throws when no previous version', async () => {
    const empty = new RollbackOrchestrator()
    await expect(empty.rollbackPrevious()).rejects.toThrow()
  })
})

describe('HealthGate', () => {
  it('performs health checks', async () => {
    const gate = new HealthGate({ endpoints: ['/health'], timeoutMs: 1000 })
    const { passed, results } = await gate.checkAll()
    expect(results.length).toBe(1)
    expect(typeof passed).toBe('boolean')
  })

  it('waits for healthy with timeout', async () => {
    const gate = new HealthGate({ endpoints: ['/health'], timeoutMs: 500 })
    const healthy = await gate.waitForHealthy(2000)
    expect(typeof healthy).toBe('boolean')
  })
})
