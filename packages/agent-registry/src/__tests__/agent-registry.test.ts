import { AgentRegistry } from '../agent-registry'
import { ContractRegistry } from '../contract-registry'
import { ConsensusEngine } from '../consensus-engine'
import type { Justification, Conflict } from '../consensus-engine'
import { ResultFusion } from '../result-fusion'
import type { NamedResult } from '../result-fusion'
import { AgentPipeline } from '../agent-pipeline'
import { CodeReviewerAgent } from '../code-reviewer-agent'
import type { CodeFile, ReviewRule } from '../code-reviewer-agent'
import type { IAgent, AgentContract, AgentResult, AgentMetrics, ValidationResult } from '../types'

function createMockAgent(
  id: string,
  capabilities: string[],
  deps: string[] = [],
): IAgent {
  return {
    id,
    contract: {
      agentId: id,
      version: '1.0.0',
      capabilities,
      inputSchema: { type: 'object', properties: {}, required: [] },
      outputSchema: { type: 'object', properties: {}, required: [] },
      performanceSLO: { maxLatency: 1000, maxTokens: 1000, minSuccessRate: 0.95 },
      dependencies: deps,
    },
    status: 'idle',
    execute: async (_input: unknown): Promise<AgentResult> => ({
      status: 'success',
      output: { result: 'ok' },
      metrics: { executionTime: 10, tokensUsed: 50, confidence: 0.9 },
    }),
    validate: (_input: unknown): ValidationResult => ({ valid: true, errors: [] }),
    cancel: async (): Promise<void> => {},
    getMetrics: async (): Promise<AgentMetrics> => ({
      tasksCompleted: 0, avgLatency: 10, successRate: 1, tokensConsumed: 50,
    }),
  }
}

describe('AgentRegistry', () => {
  it('should register and retrieve agents', () => {
    const registry = new AgentRegistry()
    const agent = createMockAgent('test-agent', ['static-analysis'])

    registry.register(agent)
    expect(registry.getAgent('test-agent')).toBe(agent)
  })

  it('should throw when registering duplicate agent', () => {
    const registry = new AgentRegistry()
    const agent = createMockAgent('dup', ['test'])

    registry.register(agent)
    expect(() => registry.register(agent)).toThrow('already registered')
  })

  it('should unregister agents', () => {
    const registry = new AgentRegistry()
    registry.register(createMockAgent('a', ['x']))
    expect(registry.unregister('a')).toBe(true)
    expect(registry.getAgent('a')).toBeUndefined()
  })

  it('should list all agents', () => {
    const registry = new AgentRegistry()
    registry.register(createMockAgent('a', ['x']))
    registry.register(createMockAgent('b', ['y']))
    expect(registry.listAgents()).toHaveLength(2)
  })

  it('should find agents by capability', () => {
    const registry = new AgentRegistry()
    registry.register(createMockAgent('a', ['static-analysis']))
    registry.register(createMockAgent('b', ['test-generation']))
    registry.register(createMockAgent('c', ['static-analysis', 'style-check']))

    const found = registry.findAgentsByCapability('static-analysis')
    expect(found).toHaveLength(2)
    expect(found.map(a => a.id)).toEqual(['a', 'c'])
  })
})

describe('ContractRegistry', () => {
  it('should register and retrieve contracts', () => {
    const reg = new ContractRegistry()
    const contract: AgentContract = {
      agentId: 'agent-v1',
      version: '1.0.0',
      capabilities: ['test'],
      inputSchema: { type: 'object', required: ['name'] },
      outputSchema: { type: 'object', required: ['result'] },
      performanceSLO: { maxLatency: 100, maxTokens: 500, minSuccessRate: 0.9 },
      dependencies: [],
    }

    reg.registerContract(contract)
    expect(reg.getContract('agent-v1')).toBe(contract)
  })

  it('should validate input against contract', () => {
    const reg = new ContractRegistry()
    reg.registerContract({
      agentId: 'v1', version: '1.0.0', capabilities: ['x'],
      inputSchema: { type: 'object', required: ['name', 'value'] },
      outputSchema: { type: 'object', required: [] },
      performanceSLO: { maxLatency: 100, maxTokens: 500, minSuccessRate: 0.9 },
      dependencies: [],
    })

    expect(reg.validateInput('v1', { name: 'test' })).toHaveLength(1)
    expect(reg.validateInput('v1', { name: 'test', value: 42 })).toHaveLength(0)
  })

  it('should validate output against contract', () => {
    const reg = new ContractRegistry()
    reg.registerContract({
      agentId: 'v1', version: '1.0.0', capabilities: ['x'],
      inputSchema: { type: 'object', required: [] },
      outputSchema: { type: 'object', required: ['result', 'status'] },
      performanceSLO: { maxLatency: 100, maxTokens: 500, minSuccessRate: 0.9 },
      dependencies: [],
    })

    expect(reg.validateOutput('v1', { result: 'ok' })).toHaveLength(1)
    expect(reg.validateOutput('v1', { result: 'ok', status: 'done' })).toHaveLength(0)
  })

  it('should return error for unknown agent', () => {
    const reg = new ContractRegistry()
    expect(reg.validateInput('unknown', {})).toHaveLength(1)
  })
})

describe('AgentPipeline', () => {
  it('should execute a sequence of agents', async () => {
    const pipeline = new AgentPipeline()
    pipeline.registerAgent(createMockAgent('a', ['x']))
    pipeline.registerAgent(createMockAgent('b', ['y']))

    const result = await pipeline.execute({
      steps: [
        { id: 's1', agentId: 'a', input: {}, retryCount: 0, maxRetries: 2 },
        { id: 's2', agentId: 'b', input: {}, retryCount: 0, maxRetries: 2 },
      ],
    })

    expect(result.status).toBe('success')
    expect(result.state.history).toHaveLength(2)
  })

  it('should handle missing agent', async () => {
    const pipeline = new AgentPipeline()
    const result = await pipeline.execute({
      steps: [
        { id: 's1', agentId: 'missing', input: {}, retryCount: 0, maxRetries: 1 },
      ],
    })

    expect(result.status).toBe('failure')
    expect(result.error).toContain('not found')
  })

  it('should handle agent execution failure', async () => {
    const failingAgent: IAgent = {
      ...createMockAgent('fail', ['x']),
      execute: async (): Promise<AgentResult> => ({
        status: 'failure',
        output: { error: 'something went wrong' },
        metrics: { executionTime: 0, tokensUsed: 0, confidence: 0 },
      }),
    }

    const pipeline = new AgentPipeline()
    pipeline.registerAgent(failingAgent)

    const result = await pipeline.execute({
      steps: [
        { id: 's1', agentId: 'fail', input: {}, retryCount: 0, maxRetries: 0 },
      ],
    })

    expect(result.status).toBe('needs-human')
  })

  it('should retry on failure and succeed', async () => {
    let attempts = 0
    const flakyAgent: IAgent = {
      ...createMockAgent('flaky', ['x']),
      execute: async (): Promise<AgentResult> => {
        attempts++
        if (attempts < 2) {
          return {
            status: 'failure',
            output: { error: 'transient error' },
            metrics: { executionTime: 0, tokensUsed: 0, confidence: 0 },
          }
        }
        return {
          status: 'success',
          output: { result: 'ok' },
          metrics: { executionTime: 10, tokensUsed: 50, confidence: 0.9 },
        }
      },
    }

    const pipeline = new AgentPipeline()
    pipeline.registerAgent(flakyAgent)

    const result = await pipeline.execute({
      steps: [
        { id: 's1', agentId: 'flaky', input: {}, retryCount: 0, maxRetries: 2 },
      ],
    })

    expect(result.status).toBe('success')
    expect(attempts).toBe(2)
  })
})

describe('CodeReviewerAgent', () => {
  const agent = new CodeReviewerAgent()

  it('should detect no-eval rule', async () => {
    const result = await agent.execute({
      files: [
        { path: 'test.ts', content: 'const x = eval("2+2")\n', language: 'ts' },
      ],
      rules: [],
      context: { project: 'test', language: 'ts', framework: 'none' },
    })

    expect(result.status).toBe('success')
    expect(result.output.issues.some(i => i.rule === 'no-eval')).toBe(true)
  })

  it('should detect no-console rule', async () => {
    const result = await agent.execute({
      files: [
        { path: 'app.ts', content: 'console.log("debug")\n', language: 'ts' },
      ],
      rules: [],
      context: { project: 'test', language: 'ts', framework: 'none' },
    })

    expect(result.output.issues.some(i => i.rule === 'no-console')).toBe(true)
  })

  it('should detect no-any rule', async () => {
    const result = await agent.execute({
      files: [
        { path: 'types.ts', content: 'function foo(x: any): void {}\n', language: 'ts' },
      ],
      rules: [],
      context: { project: 'test', language: 'ts', framework: 'none' },
    })

    expect(result.output.issues.some(i => i.rule === 'no-any')).toBe(true)
  })

  it('should detect no-secrets rule', async () => {
    const result = await agent.execute({
      files: [
        { path: 'config.ts', content: 'const api_key = "sk-1234567890abcdef"\n', language: 'ts' },
      ],
      rules: [],
      context: { project: 'test', language: 'ts', framework: 'none' },
    })

    expect(result.output.issues.some(i => i.rule === 'no-secrets')).toBe(true)
  })

  it('should detect no-sql-injection rule', async () => {
    const result = await agent.execute({
      files: [
        { path: 'db.ts', content: 'execute(`SELECT * FROM users WHERE id = ${id}`)\n', language: 'ts' },
      ],
      rules: [],
      context: { project: 'test', language: 'ts', framework: 'none' },
    })

    expect(result.output.issues.some(i => i.rule === 'no-sql-injection')).toBe(true)
  })

  it('should detect missing-error-handling rule', async () => {
    const result = await agent.execute({
      files: [
        { path: 'handler.ts', content: 'promise.catch()\n', language: 'ts' },
      ],
      rules: [],
      context: { project: 'test', language: 'ts', framework: 'none' },
    })

    expect(result.output.issues.some(i => i.rule === 'missing-error-handling')).toBe(true)
  })

  it('should detect function length exceeding limit', async () => {
    const longFnLines: string[] = [
      'function longFn() {',
    ]
    for (let i = 0; i < 55; i++) {
      longFnLines.push(`  const x${i} = ${i};`)
    }
    longFnLines.push('}')

    const result = await agent.execute({
      files: [
        { path: 'long.ts', content: longFnLines.join('\n'), language: 'ts' },
      ],
      rules: [],
      context: { project: 'test', language: 'ts', framework: 'none' },
    })

    expect(result.output.issues.some(i => i.rule === 'max-function-length')).toBe(true)
  })

  it('should detect duplicate imports', async () => {
    const content = [
      'import { Component } from "react"',
      'import { useState } from "react"',
    ].join('\n')

    const result = await agent.execute({
      files: [
        { path: 'dup.ts', content, language: 'ts' },
      ],
      rules: [],
      context: { project: 'test', language: 'ts', framework: 'none' },
    })

    expect(result.output.issues.some(i => i.rule === 'no-duplicate-import')).toBe(true)
  })

  it('should calculate score correctly', async () => {
    const result = await agent.execute({
      files: [
        { path: 'clean.ts', content: 'const x = 1\n', language: 'ts' },
        { path: 'dirty.ts', content: 'const y: any = eval("2")\n', language: 'ts' },
      ],
      rules: [],
      context: { project: 'test', language: 'ts', framework: 'none' },
    })

    expect(result.output.score).toBeLessThan(100)
    expect(result.output.summary.totalFiles).toBe(2)
    expect(result.output.summary.passed).toBeDefined()
  })

  it('should ignore unsupported languages', async () => {
    const result = await agent.execute({
      files: [
        { path: 'styles.css', content: '.class { color: red; }\n', language: 'css' },
      ],
      rules: [],
      context: { project: 'test', language: 'css', framework: 'none' },
    })

    expect(result.output.issues).toHaveLength(0)
  })

  it('should accept non-empty rules array', async () => {
    const customRule: ReviewRule = {
      id: 'custom-rule', pattern: /TODO/, severity: 'warning',
      category: 'style', message: 'Found TODO marker',
    }

    const result = await agent.execute({
      files: [
        { path: 'test.ts', content: '// TODO: implement\n', language: 'ts' },
      ],
      rules: [customRule],
      context: { project: 'test', language: 'ts', framework: 'none' },
    })

    expect(result.output.issues.some(i => i.rule === 'custom-rule')).toBe(true)
  })

  it('should validate input correctly', () => {
    const valid = agent.validate({
      files: [{ path: 'a.ts', content: 'x', language: 'ts' }],
      rules: [],
      context: { project: 'p', language: 'ts', framework: 'f' },
    })
    expect(valid.valid).toBe(true)

    const invalid = agent.validate({ rules: [], context: {} })
    expect(invalid.valid).toBe(false)
    expect(invalid.errors.length).toBeGreaterThan(0)
  })

  it('should consolidate duplicate issues', () => {
    const issues = agent.consolidateDuplicates([
      { file: 'a.ts', line: 1, column: 0, severity: 'error', rule: 'no-eval', message: 'x', category: 'security' },
      { file: 'a.ts', line: 1, column: 0, severity: 'error', rule: 'no-eval', message: 'x', category: 'security' },
    ])
    expect(issues).toHaveLength(1)
  })
})

describe('ConsensusEngine', () => {
  const engine = new ConsensusEngine()

  it('should reach consensus with high score', () => {
    const conflicts: Conflict[] = [
      {
        id: 'c1', agents: ['a', 'b'],
        description: 'Output mismatch',
        payloadA: { value: 1 }, payloadB: { value: 2 },
      },
    ]

    const justifications: Justification[] = [
      {
        agentId: 'a', evidence: 1, alignsWithPolicy: 1,
        consistencyWithHistory: 0.8, alternativeAnalysis: 0.7,
      },
      {
        agentId: 'b', evidence: 0.3, alignsWithPolicy: 0.4,
        consistencyWithHistory: 0.5, alternativeAnalysis: 0.2,
      },
    ]

    const resolutions = engine.reachConsensus(conflicts, justifications)
    expect(resolutions).toHaveLength(1)
    expect(resolutions[0].resolution).toBe('accept')
    expect(resolutions[0].winner).toBe('a')
    expect(resolutions[0].score).toBeGreaterThanOrEqual(0.7)
  })

  it('should escalate when no agent reaches threshold', () => {
    const conflicts: Conflict[] = [
      {
        id: 'c1', agents: ['a'],
        description: 'Low confidence',
        payloadA: {}, payloadB: {},
      },
    ]

    const justifications: Justification[] = [
      {
        agentId: 'a', evidence: 0.1, alignsWithPolicy: 0.2,
        consistencyWithHistory: 0.1, alternativeAnalysis: 0.1,
      },
    ]

    const resolutions = engine.reachConsensus(conflicts, justifications)
    expect(resolutions[0].resolution).toBe('escalate')
  })

  it('should escalate when no justification provided', () => {
    const conflicts: Conflict[] = [
      {
        id: 'c1', agents: ['a', 'b'],
        description: 'No justification',
        payloadA: {}, payloadB: {},
      },
    ]

    const resolutions = engine.reachConsensus(conflicts, [])
    expect(resolutions[0].resolution).toBe('escalate')
  })
})

describe('ResultFusion', () => {
  const fusion = new ResultFusion()

  it('should throw for empty results', () => {
    expect(() => fusion.merge([])).toThrow('Cannot merge empty results')
  })

  it('should return single result directly', () => {
    const result = fusion.merge([
      { agentId: 'a', result: { status: 'success', output: 'hello', metrics: { executionTime: 1, tokensUsed: 1, confidence: 0.9 } } },
    ])
    expect(result.value).toBe('hello')
    expect(result.confidence).toBe(0.9)
  })

  it('should perform weighted vote for categorical values', () => {
    fusion.setHistoricalConfidence('a', 0.9)
    fusion.setHistoricalConfidence('b', 0.5)

    const result = fusion.merge<string>([
      { agentId: 'a', result: { status: 'success', output: 'cat', metrics: { executionTime: 1, tokensUsed: 1, confidence: 0.8 } } },
      { agentId: 'b', result: { status: 'success', output: 'dog', metrics: { executionTime: 1, tokensUsed: 1, confidence: 0.6 } } },
      { agentId: 'a', result: { status: 'success', output: 'cat', metrics: { executionTime: 1, tokensUsed: 1, confidence: 0.8 } } },
    ])

    expect(result.value).toBe('cat')
    expect(result.method).toBe('vote')
  })

  it('should compute weighted average for numeric values', () => {
    fusion.setHistoricalConfidence('a', 0.8)
    fusion.setHistoricalConfidence('b', 0.4)

    const result = fusion.merge<number>([
      { agentId: 'a', result: { status: 'success', output: 100, metrics: { executionTime: 1, tokensUsed: 1, confidence: 0.9 } } },
      { agentId: 'b', result: { status: 'success', output: 50, metrics: { executionTime: 1, tokensUsed: 1, confidence: 0.5 } } },
    ])

    expect(result.method).toBe('average')
    expect(result.value).toBeCloseTo(83.33, 0)
  })

  it('should use best confidence for complex values', () => {
    fusion.setHistoricalConfidence('a', 0.9)
    fusion.setHistoricalConfidence('b', 0.3)

    const result = fusion.merge<{ x: number }>([
      { agentId: 'a', result: { status: 'success', output: { x: 1 }, metrics: { executionTime: 1, tokensUsed: 1, confidence: 0.9 } } },
      { agentId: 'b', result: { status: 'success', output: { x: 2 }, metrics: { executionTime: 1, tokensUsed: 1, confidence: 0.3 } } },
    ])

    expect(result.method).toBe('best-confidence')
    expect(JSON.stringify(result.value)).toBe(JSON.stringify({ x: 1 }))
  })
})
