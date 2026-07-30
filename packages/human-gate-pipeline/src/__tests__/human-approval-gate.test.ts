import { EventEmitter } from 'events'
import {
  HumanApprovalGate,
  NotificationRouter,
  EscalationManager,
  ApprovalLogger,
  PendingActionsStore,
  HITLCircuitBreaker,
} from '../human-approval-gate'
import {
  Step, Context, HITLConfig, Channel,
  NotificationMessage, NotificationChannel,
} from '../types'

function makeStep(overrides?: Partial<Step>): Step {
  return {
    id: 'step-1',
    description: 'Deploy to production',
    type: 'deploy',
    action: 'deploy',
    target: 'production-server',
    parameters: { version: '2.0.0' },
    impact: 'medium',
    estimatedRisk: 0.5,
    requiresApproval: true,
    ...overrides,
  }
}

function makeContext(overrides?: Partial<Context>): Context {
  return {
    confidence: 0.5,
    risk: 0.5,
    urgency: 0.3,
    actionType: 'deploy',
    domain: 'infra',
    environment: 'prod',
    agentId: 'agent-1',
    sessionId: 'session-1',
    traceId: 'trace-1',
    autonomyLevel: 'guided',
    metadata: {},
    ...overrides,
  }
}

function makeConfig(overrides?: Partial<HITLConfig>): Partial<HITLConfig> {
  return {
    autoApproveThreshold: 0.9,
    maxRiskForAutoApprove: 0.3,
    escalationTimeouts: [1, 1, 1],
    escalationChannels: [['theia_widget'], ['slack'], ['email']],
    maxEscalationLevels: 3,
    defaultFallback: 'reject',
    requireTwoFactor: false,
    auditLogEnabled: true,
    adaptiveEnabled: false,
    circuitBreakerEnabled: true,
    maxPendingRequests: 50,
    requestExpiryMs: 86400000,
    backupHumanIds: [],
    ...overrides,
  }
}

async function flush(): Promise<void> {
  await new Promise<void>(resolve => setImmediate(resolve))
}

describe('HumanApprovalGate', () => {
  describe('auto-approve', () => {
    it('auto-approves when confidence >= threshold and risk <= maxRisk', async () => {
      const gate = new HumanApprovalGate(makeConfig())
      const result = await gate.requestApproval(
        makeStep(),
        makeContext({ confidence: 0.95, risk: 0.2 })
      )

      expect(result.decision).toBe('auto-approved')
      expect(result.reason).toContain('confidence=0.95')
      expect(result.auditHash).toBeDefined()
    })

    it('does not auto-approve when confidence below threshold', async () => {
      const gate = new HumanApprovalGate(makeConfig())
      const step = makeStep()
      const context = makeContext({ confidence: 0.5, risk: 0.2 })

      const resultPromise = gate.requestApproval(step, context)
      await flush()
      const g = globalThis as Record<string, unknown>
      const cb = g.hitlResponseCallback
      if (typeof cb === 'function') {
        cb({ requestId: '', decision: 'approved', approvedBy: 'test' })
      }
      const result = await resultPromise
      expect(result.decision).not.toBe('auto-approved')
    })

    it('does not auto-approve when risk exceeds maxRisk', async () => {
      const gate = new HumanApprovalGate(makeConfig())
      const step = makeStep()
      const context = makeContext({ confidence: 0.95, risk: 0.5 })

      const resultPromise = gate.requestApproval(step, context)
      await flush()
      const g = globalThis as Record<string, unknown>
      const cb = g.hitlResponseCallback
      if (typeof cb === 'function') {
        cb({ requestId: '', decision: 'approved', approvedBy: 'test' })
      }
      const result = await resultPromise
      expect(result.decision).not.toBe('auto-approved')
    })
  })

  describe('circuit breaker', () => {
    it('returns fallback when circuit breaker is engaged', async () => {
      const gate = new HumanApprovalGate(makeConfig({ circuitBreakerEnabled: true }))

      gate.emergencyStop('Test emergency', 'test-user')

      const result = await gate.requestApproval(
        makeStep(),
        makeContext({ confidence: 0.95, risk: 0.2 })
      )

      expect(result.decision).toBe('fallback')
      expect(result.reason).toContain('Circuit breaker')
    })

    it('engages when pending threshold exceeded', () => {
      const cb = new HITLCircuitBreaker(3)
      expect(cb.isEngaged()).toBe(false)

      cb.incrementPending()
      expect(cb.isEngaged()).toBe(false)

      cb.incrementPending()
      expect(cb.isEngaged()).toBe(false)

      cb.incrementPending()
      expect(cb.isEngaged()).toBe(true)
    })

    it('disengages when pending drops below 50% threshold', () => {
      const cb = new HITLCircuitBreaker(10)
      for (let i = 0; i < 10; i++) {
        cb.incrementPending()
      }
      expect(cb.isEngaged()).toBe(true)

      for (let i = 0; i < 6; i++) {
        cb.decrementPending()
      }
      expect(cb.isEngaged()).toBe(false)
    })

    it('rejects requestApproval when circuit breaker engaged', async () => {
      const gate = new HumanApprovalGate(makeConfig({ circuitBreakerEnabled: true }))

      gate.emergencyStop('System overload', 'system')

      const result = await gate.requestApproval(makeStep(), makeContext())
      expect(result.decision).toBe('fallback')
    })
  })

  describe('escalation flow', () => {
    it('sends notification failure when channel throws', async () => {
      const failingChannel: NotificationChannel = {
        name: 'slack',
        priority: 10,
        send: async () => { throw new Error('Channel unavailable') },
        isAvailable: async () => true,
      }
      const gate = new HumanApprovalGate(
        makeConfig({ escalationTimeouts: [1], escalationChannels: [['slack']], maxEscalationLevels: 1 }),
        [failingChannel]
      )

      const resultPromise = gate.requestApproval(makeStep(), makeContext({ confidence: 0.3, risk: 0.5 }))
      await new Promise<void>(r => setTimeout(r, 10))
      const result = await resultPromise

      expect(result.notificationHistory.length).toBeGreaterThan(0)
      const failedNotification = result.notificationHistory.find(n => !n.success)
      expect(failedNotification).toBeDefined()
      if (failedNotification) {
        expect(failedNotification.error).toBeDefined()
      }
    })

    it('times out and rejects when no response received', async () => {
      const gate = new HumanApprovalGate(makeConfig({
        escalationTimeouts: [1, 1, 1],
        defaultFallback: 'reject',
      }))

      const result = await gate.requestApproval(
        makeStep(),
        makeContext({ confidence: 0.3, risk: 0.5 })
      )

      expect(result.decision).toBe('rejected')
      expect(result.reason).toContain('Total timeout')
    })

    it('executes fallback continue when configured', async () => {
      const gate = new HumanApprovalGate(makeConfig({
        escalationTimeouts: [1, 1],
        defaultFallback: 'continue',
      }))

      const result = await gate.requestApproval(
        makeStep({ impact: 'low' }),
        makeContext({ confidence: 0.3, risk: 0.1, environment: 'dev' })
      )

      expect(result.decision).toBe('approved')
      expect(result.reason).toContain('auto-continuing')
    })
  })

  describe('approval levels', () => {
    it('sets level 3 for critical impact', async () => {
      const eventBus = new EventEmitter()
      const emitted: Array<{ type: string; payload: Record<string, unknown> }> = []
      eventBus.on('hitl.request.created', (event: { type: string; payload: Record<string, unknown> }) => {
        emitted.push(event)
      })

      const gate = new HumanApprovalGate(
        makeConfig({ escalationTimeouts: [1], escalationChannels: [['theia_widget']], maxEscalationLevels: 1 }),
        undefined,
        eventBus
      )

      await gate.requestApproval(
        makeStep({ impact: 'critical', estimatedRisk: 0.9 }),
        makeContext({ confidence: 0.3, risk: 0.9 })
      )

      const createdEvent = emitted.find(e => e.type === 'hitl.request.created')
      expect(createdEvent).toBeDefined()
      if (createdEvent) {
        expect(createdEvent.payload.level).toBe(3)
      }
    })

    it('sets level 2 for prod environment with medium risk', async () => {
      const eventBus = new EventEmitter()
      const emitted: Array<{ type: string; payload: Record<string, unknown> }> = []
      eventBus.on('hitl.request.created', (event: { type: string; payload: Record<string, unknown> }) => {
        emitted.push(event)
      })

      const gate = new HumanApprovalGate(
        makeConfig({ escalationTimeouts: [1], escalationChannels: [['theia_widget']], maxEscalationLevels: 1 }),
        undefined,
        eventBus
      )

      await gate.requestApproval(
        makeStep({ impact: 'medium' }),
        makeContext({ confidence: 0.3, risk: 0.4, environment: 'prod' })
      )

      const createdEvent = emitted.find(e => e.type === 'hitl.request.created')
      expect(createdEvent).toBeDefined()
      if (createdEvent) {
        expect(createdEvent.payload.level).toBe(2)
      }
    })

    it('sets level 1 for low risk dev environment', async () => {
      const eventBus = new EventEmitter()
      const emitted: Array<{ type: string; payload: Record<string, unknown> }> = []
      eventBus.on('hitl.request.created', (event: { type: string; payload: Record<string, unknown> }) => {
        emitted.push(event)
      })

      const gate = new HumanApprovalGate(
        makeConfig({ escalationTimeouts: [1], escalationChannels: [['theia_widget']], maxEscalationLevels: 1 }),
        undefined,
        eventBus
      )

      await gate.requestApproval(
        makeStep({ impact: 'low', type: 'read' }),
        makeContext({ confidence: 0.3, risk: 0.2, environment: 'dev' })
      )

      const createdEvent = emitted.find(e => e.type === 'hitl.request.created')
      expect(createdEvent).toBeDefined()
      if (createdEvent) {
        expect(createdEvent.payload.level).toBe(1)
      }
    })
  })

  describe('emergency stop and manual override', () => {
    it('stops all pending requests on emergency stop', async () => {
      const gate = new HumanApprovalGate(makeConfig({
        escalationTimeouts: [5000],
        escalationChannels: [['theia_widget']],
        maxEscalationLevels: 1,
      }))

      const step = makeStep()
      const context = makeContext({ confidence: 0.3, risk: 0.5 })
      const resultPromise = gate.requestApproval(step, context)

      await flush()

      gate.emergencyStop('Incident detected', 'admin')

      const result = await resultPromise
      expect(result.decision).toBe('rejected')
    })

    it('returns true for successful manual override', () => {
      const gate = new HumanApprovalGate(makeConfig({
        escalationTimeouts: [50000],
        escalationChannels: [['theia_widget']],
        maxEscalationLevels: 1,
      }))

      gate.requestApproval(makeStep(), makeContext({ confidence: 0.3, risk: 0.5 })).catch(() => {})

      const pendingIds = gate.getPendingRequestIds()
      if (pendingIds.length > 0) {
        const result = gate.manualOverride(pendingIds[0], 'approved', 'admin', 'Emergency override')
        expect(result).toBe(true)
      }
    })

    it('returns false for unknown request in manual override', () => {
      const gate = new HumanApprovalGate()
      const result = gate.manualOverride('unknown-id', 'approved', 'admin', 'Test')
      expect(result).toBe(false)
    })
  })

  describe('NotificationRouter', () => {
    it('sends message to registered channel', async () => {
      let received: NotificationMessage | undefined
      const testChannel: NotificationChannel = {
        name: 'slack',
        priority: 5,
        send: async (msg) => {
          received = msg
          return true
        },
        isAvailable: async () => true,
      }

      const router = new NotificationRouter([testChannel])
      const sent = await router.send({
        channel: 'slack',
        requestId: 'req-1',
        title: 'Test',
        body: 'Body',
        actions: ['approve'],
        priority: 'normal',
        metadata: {},
      })

      expect(sent).toBe(true)
      expect(received).toBeDefined()
      if (received) {
        expect(received.title).toBe('Test')
      }
    })

    it('returns false for unregistered channel', async () => {
      const router = new NotificationRouter([])
      const sent = await router.send({
        channel: 'slack',
        requestId: 'req-1',
        title: 'Test',
        body: 'Body',
        actions: ['approve'],
        priority: 'normal',
        metadata: {},
      })

      expect(sent).toBe(false)
    })
  })

  describe('PendingActionsStore', () => {
    it('adds and retrieves pending actions', () => {
      const store = new PendingActionsStore(10)
      const action = {
        requestId: 'req-1',
        step: makeStep(),
        context: makeContext(),
        level: 2 as const,
        status: 'pending' as const,
        createdAt: Date.now(),
        expiresAt: Date.now() + 10000,
        notificationsSent: 0,
        lastNotificationAt: Date.now(),
        decisionDeadline: Date.now() + 30000,
      }

      const added = store.add(action)
      expect(added).toBe(true)

      const retrieved = store.get('req-1')
      expect(retrieved).toBeDefined()
      if (retrieved) {
        expect(retrieved.requestId).toBe('req-1')
      }
    })

    it('rejects add when store is full', () => {
      const store = new PendingActionsStore(1)
      const action = {
        requestId: 'req-1',
        step: makeStep(),
        context: makeContext(),
        level: 1 as const,
        status: 'pending' as const,
        createdAt: Date.now(),
        expiresAt: Date.now() + 10000,
        notificationsSent: 0,
        lastNotificationAt: Date.now(),
        decisionDeadline: Date.now() + 30000,
      }

      expect(store.add(action)).toBe(true)

      const action2 = { ...action, requestId: 'req-2' }
      expect(store.add(action2)).toBe(false)
    })

    it('returns empty array from getPending when no actions', () => {
      const store = new PendingActionsStore()
      expect(store.getPending()).toEqual([])
    })

    it('resolves pending action', () => {
      const store = new PendingActionsStore()
      const action = {
        requestId: 'req-1',
        step: makeStep(),
        context: makeContext(),
        level: 1 as const,
        status: 'pending' as const,
        createdAt: Date.now(),
        expiresAt: Date.now() + 10000,
        notificationsSent: 0,
        lastNotificationAt: Date.now(),
        decisionDeadline: Date.now() + 30000,
      }
      store.add(action)
      store.resolve('req-1', 'approved')

      const retrieved = store.get('req-1')
      expect(retrieved).toBeDefined()
      if (retrieved) {
        expect(retrieved.status).toBe('approved')
      }
    })

    it('cancels all pending actions', () => {
      const store = new PendingActionsStore()
      const action = {
        requestId: 'req-1',
        step: makeStep(),
        context: makeContext(),
        level: 1 as const,
        status: 'pending' as const,
        createdAt: Date.now(),
        expiresAt: Date.now() + 10000,
        notificationsSent: 0,
        lastNotificationAt: Date.now(),
        decisionDeadline: Date.now() + 30000,
      }
      store.add(action)
      store.cancelAll('Test cancel')

      expect(store.count()).toBe(0)
    })
  })

  describe('HITLCircuitBreaker', () => {
    it('starts disengaged', () => {
      const cb = new HITLCircuitBreaker()
      expect(cb.isEngaged()).toBe(false)
    })

    it('engages and disengages', () => {
      const cb = new HITLCircuitBreaker()
      cb.engage('Test reason', 'admin')
      expect(cb.isEngaged()).toBe(true)

      cb.disengage()
      expect(cb.isEngaged()).toBe(false)
    })

    it('stays engaged after emergencyStop', () => {
      const cb = new HITLCircuitBreaker()
      cb.emergencyStop('Critical issue', 'admin')
      expect(cb.isEngaged()).toBe(true)
      expect(cb.getState().emergencyStopActive).toBe(true)
    })

    it('tracks pending count', () => {
      const cb = new HITLCircuitBreaker(5)
      expect(cb.getState().pendingRequestCount).toBe(0)

      cb.incrementPending()
      expect(cb.getState().pendingRequestCount).toBe(1)

      cb.decrementPending()
      expect(cb.getState().pendingRequestCount).toBe(0)
    })
  })

  describe('ApprovalLogger', () => {
    it('logs approval and maintains chain', async () => {
      const logger = new ApprovalLogger()
      const step = makeStep()
      const context = makeContext()

      const result = {
        decision: 'auto-approved' as const,
        timestamp: Date.now(),
        reason: 'test',
        notificationHistory: [],
        auditHash: 'test-hash',
      }

      const entry = await logger.log(step, context, result)
      expect(entry.decision).toBe('auto-approved')
      expect(entry.hash).toBeDefined()
      expect(entry.previousHash).toBe('0'.repeat(64))
      expect(entry.stepId).toBe('step-1')
    })

    it('links entries via previousHash', async () => {
      const logger = new ApprovalLogger()

      const step = makeStep()
      const context = makeContext()

      await logger.log(step, context, {
        decision: 'approved',
        timestamp: 1000,
        reason: 'first',
        notificationHistory: [],
      })

      await logger.log(step, context, {
        decision: 'approved',
        timestamp: 2000,
        reason: 'second',
        notificationHistory: [],
      })

      expect(logger.getChainLength()).toBe(2)
      const chain = logger.getChain()
      expect(chain[1].previousHash).toBe(chain[0].hash)
    })

    it('verifies chain integrity', async () => {
      const logger = new ApprovalLogger()
      const step = makeStep()
      const context = makeContext()

      await logger.log(step, context, {
        decision: 'approved',
        timestamp: 1000,
        reason: 'first',
        notificationHistory: [],
      })

      await logger.log(step, context, {
        decision: 'rejected',
        timestamp: 2000,
        reason: 'second',
        notificationHistory: [],
      })

      expect(logger.verifyChain()).toBe(true)
    })

    it('detects chain tampering', async () => {
      const logger = new ApprovalLogger()
      const step = makeStep()
      const context = makeContext()

      await logger.log(step, context, {
        decision: 'approved',
        timestamp: 1000,
        reason: 'first',
        notificationHistory: [],
      })

      await logger.log(step, context, {
        decision: 'rejected',
        timestamp: 2000,
        reason: 'second',
        notificationHistory: [],
      })

      const chain = logger.getChain()
      chain[1].decision = 'approved'

      expect(logger.verifyChain()).toBe(false)
    })
  })

  describe('EscalationManager', () => {
    it('simulates escalation path', () => {
      const manager = new EscalationManager(
        [300000, 600000, 900000],
        [['theia_widget'], ['slack'], ['email']],
        3
      )

      const request = {
        id: 'req-1',
        step: makeStep(),
        context: makeContext(),
        status: 'pending' as const,
        level: 1 as const,
        createdAt: Date.now(),
        escalationPath: [],
        traceId: 'trace-1',
        sessionId: 'session-1',
      }

      const path = (manager as any).simulateEscalation(request)
      expect(path).toHaveLength(3)
      expect(path[0]).toContain('Level 1')
      expect(path[0]).toContain('theia_widget')
      expect(path[1]).toContain('Level 2')
      expect(path[2]).toContain('Level 3')
    })

    it('returns rejected on total timeout with reject fallback', async () => {
      const manager = new EscalationManager(
        [1, 1],
        [['theia_widget'], ['slack']],
        2
      )

      const request = {
        id: 'req-1',
        step: makeStep(),
        context: makeContext({ confidence: 0.3, risk: 0.5 }),
        status: 'pending' as const,
        level: 1 as const,
        createdAt: Date.now(),
        escalationPath: [],
        traceId: 'trace-1',
        sessionId: 'session-1',
      }

      const result = await manager.execute(
        request,
        async () => {},
        'reject'
      )

      expect(result.decision).toBe('rejected')
    })
  })

  describe('HITLStats', () => {
    it('returns stats after approvals', async () => {
      const gate = new HumanApprovalGate(makeConfig())

      await gate.requestApproval(
        makeStep(),
        makeContext({ confidence: 0.95, risk: 0.2 })
      )

      const stats = gate.getStats()
      expect(stats.totalDecisions).toBe(1)
      expect(stats.autoApprovalRate).toBe(1)
      expect(stats.circuitBreakerEngaged).toBe(false)
      expect(stats.pendingCount).toBe(0)
    })
  })
})
