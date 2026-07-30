import { IntentAgent, PlanAgent, CodeAgent, TestAgent } from '../agents'
import { AgentOrchestrator } from '../orchestrator'
import { IAgent, AgentInput, AgentRole, ConsensusVote, ConsensusLevel } from '../types'

describe('IntentAgent', () => {
  it('should extract intent from text', async () => {
    const agent = new IntentAgent()
    const output = await agent.execute({
      taskId: 't1', context: '', data: { rawText: 'Create a fast API system for users' },
    })
    expect(output.role).toBe('intent')
    expect(output.confidence).toBeGreaterThan(0)
    expect((output.result as any).intent).toBeDefined()
    expect((output.result as any).ambiguities.length).toBeGreaterThan(0)
  })

  it('should have capabilities', () => {
    const agent = new IntentAgent()
    expect(agent.getCapabilities().length).toBeGreaterThan(0)
    expect(agent.getCapabilities()).toContain('intent-extraction')
  })
})

describe('PlanAgent', () => {
  it('should create execution plan', async () => {
    const agent = new PlanAgent()
    const output = await agent.execute({
      taskId: 't2', context: '', data: { intent: {}, availableAgents: ['intent', 'plan', 'code', 'test'], constraints: [] },
    })
    expect(output.role).toBe('plan')
    const plan = output.result as any
    expect(plan.steps.length).toBe(4)
    expect(plan.criticalPath).toBeDefined()
  })
})

describe('CodeAgent', () => {
  it('should generate code files', async () => {
    const agent = new CodeAgent()
    const output = await agent.execute({
      taskId: 't3', context: '', data: { specification: 'Create a login API', language: 'typescript', constraints: [] },
    })
    expect(output.role).toBe('code')
    const code = output.result as any
    expect(code.files.length).toBeGreaterThan(0)
    expect(code.quality.score).toBeGreaterThan(0)
  })
})

describe('TestAgent', () => {
  it('should generate tests', async () => {
    const agent = new TestAgent()
    const output = await agent.execute({
      taskId: 't4', context: '', data: { codeFiles: [], testFramework: 'vitest', coverageTarget: 80 },
    })
    expect(output.role).toBe('test')
    const test = output.result as any
    expect(test.testFiles.length).toBeGreaterThan(0)
    expect(test.coverage).toBe(80)
  })
})

describe('AgentOrchestrator', () => {
  it('should register and retrieve agents', () => {
    const orchestrator = new AgentOrchestrator()
    orchestrator.registerAgent(new IntentAgent())
    const agent = orchestrator.getAgent('intent')
    expect(agent).toBeDefined()
    expect(agent!.role).toBe('intent')
  })

  it('should execute pipeline with registered agents', async () => {
    const orchestrator = new AgentOrchestrator([
      new IntentAgent(),
      new PlanAgent(),
      new CodeAgent(),
      new TestAgent(),
    ])

    const input: AgentInput = {
      taskId: 'pipe-1',
      context: 'Build a user authentication system',
      data: { rawText: 'Create a secure login system with JWT tokens' },
    }

    const { outputs, context } = await orchestrator.executePipeline(input, ['intent', 'plan', 'code', 'test'])
    expect(context.status).toBe('completed')
    expect(outputs.size).toBe(4)
    expect(outputs.has('intent')).toBe(true)
    expect(outputs.has('test')).toBe(true)
  })

  it('should fail when agent is missing', async () => {
    const orchestrator = new AgentOrchestrator([new IntentAgent()])
    const { context } = await orchestrator.executePipeline(
      { taskId: 'fail-1', context: '', data: {} },
      ['intent', 'code'],
    )
    expect(context.status).toBe('failed')
    expect(context.errors.length).toBeGreaterThan(0)
  })

  it('should reach consensus by approval', async () => {
    const orchestrator = new AgentOrchestrator()
    const votes: ConsensusVote[] = [
      { agentRole: 'code', approved: true, reason: 'Good' },
      { agentRole: 'test', approved: false, reason: 'Missing tests' },
    ]
    const result = await orchestrator.reachConsensus(votes, 'approval')
    expect(result.accepted).toBe(true)
  })

  it('should require unanimous consensus', async () => {
    const orchestrator = new AgentOrchestrator()
    const votes: ConsensusVote[] = [
      { agentRole: 'code', approved: true },
      { agentRole: 'test', approved: false },
    ]
    const result = await orchestrator.reachConsensus(votes, 'unanimous')
    expect(result.accepted).toBe(false)
  })

  it('should accept majority consensus', async () => {
    const orchestrator = new AgentOrchestrator()
    const votes: ConsensusVote[] = [
      { agentRole: 'code', approved: true },
      { agentRole: 'test', approved: true },
      { agentRole: 'sec', approved: false },
    ]
    const result = await orchestrator.reachConsensus(votes, 'majority')
    expect(result.accepted).toBe(true)
  })
})
