import { HITLEngine } from '../hitl-engine'
import { EscalationEngine } from '../escalation-engine'
import { EscalationPolicy } from '../types'

describe('HITLEngine', () => {
  let engine: HITLEngine

  beforeEach(() => { engine = new HITLEngine() })

  it('should create a gate', () => {
    const gate = engine.createGate('agent1', 'rm -rf /', 'Delete entire filesystem', 'critical')
    expect(gate.id).toContain('gate-')
    expect(gate.status).toBe('pending')
    expect(gate.urgency).toBe('critical')
  })

  it('should resolve a gate', () => {
    const gate = engine.createGate('agent1', 'deploy', 'Deploy to production', 'high')
    const result = engine.resolveGate(gate.id, 'approve', 'user1')
    expect(result.approved).toBe(true)
    expect(result.action).toBe('approve')
    expect(engine.getPendingGates().length).toBe(0)
  })

  it('should list pending gates', () => {
    engine.createGate('a1', 'action1', 'ctx', 'low')
    engine.createGate('a1', 'action2', 'ctx', 'medium')
    expect(engine.getPendingGates().length).toBe(2)
  })

  it('should filter by agent', () => {
    engine.createGate('a1', 'act', 'ctx', 'low')
    engine.createGate('a2', 'act', 'ctx', 'low')
    expect(engine.getGatesByAgent('a1').length).toBe(1)
  })

  it('should detect timeouts', () => {
    const engine2 = new HITLEngine({ defaultTimeoutMs: -1 })
    engine2.createGate('a1', 'act', 'ctx', 'low')
    const timedOut = engine2.checkTimeouts()
    expect(timedOut.length).toBe(1)
  })

  it('should auto-approve matching patterns', () => {
    const engine2 = new HITLEngine({ autoApprovePatterns: ['^read-'] })
    expect(engine2.shouldAutoApprove('read-file')).toBe(true)
    expect(engine2.shouldAutoApprove('delete-file')).toBe(false)
  })
})

describe('EscalationEngine', () => {
  let engine: EscalationEngine

  beforeEach(() => {
    engine = new EscalationEngine()
    engine.registerPolicy({
      id: 'p1', name: 'High Risk Escalation',
      conditions: [{ metric: 'riskLevel', operator: '>', value: 2 }],
      steps: [
        { level: 'dev', notifyAfterMs: 0, action: 'notify' },
        { level: 'tech-lead', notifyAfterMs: 60000, action: 'approve' },
      ],
    })
  })

  it('should return escalation step based on elapsed time', () => {
    const gate = { id: 'g1', type: 'pre-flight' as const, agentId: 'a1', action: 'deploy', context: '', riskLevel: 'high', urgency: 'medium' as const, createdAt: '', status: 'pending' as const, timeoutMs: 300000 }
    const step = engine.getEscalationStep(gate, 120000)
    expect(step).not.toBeNull()
    expect(step!.level).toBe('tech-lead')
  })
})
