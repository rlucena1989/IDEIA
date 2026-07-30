import { InMemoryEventStore, InMemorySnapshotStore, ProjectionEngine, SagaCoordinator } from '../event-sourcing'
import { DomainEvent, Projection } from '../types'

describe('InMemoryEventStore', () => {
  let store: InMemoryEventStore
  beforeEach(() => { store = new InMemoryEventStore() })

  it('should append and read events', async () => {
    const event: DomainEvent = { id: 'e1', aggregateId: 'agg-1', type: 'UserCreated', data: { name: 'John' }, version: 1, timestamp: new Date().toISOString() }
    await store.append(event)
    const events = await store.readStream('agg-1')
    expect(events.length).toBe(1)
    expect(events[0].type).toBe('UserCreated')
  })

  it('should read from version', async () => {
    for (let i = 1; i <= 3; i++) await store.append({ id: `e${i}`, aggregateId: 'agg-1', type: 'Event', data: {}, version: i, timestamp: '' })
    const events = await store.readFromVersion('agg-1', 1)
    expect(events.length).toBe(2)
  })
})

describe('InMemorySnapshotStore', () => {
  let store: InMemorySnapshotStore
  beforeEach(() => { store = new InMemorySnapshotStore() })

  it('should save and load snapshots', async () => {
    await store.save('agg-1', { counter: 5 }, 5)
    const snapshot = await store.load('agg-1')
    expect(snapshot).not.toBeNull()
    expect(snapshot!.version).toBe(5)
    expect(snapshot!.state.counter).toBe(5)
  })

  it('should return null for missing snapshots', async () => {
    const snapshot = await store.load('missing')
    expect(snapshot).toBeNull()
  })
})

describe('ProjectionEngine', () => {
  it('should process events through projections', async () => {
    const engine = new ProjectionEngine()
    const projection: Projection = {
      name: 'count',
      async process() {},
      async getState() { return { count: 3 } },
    }
    engine.register(projection)
    const state = await engine.getState('count')
    expect(state).toEqual({ count: 3 })
  })
})

describe('SagaCoordinator', () => {
  it('should track saga step completion', async () => {
    const coordinator = new SagaCoordinator()
    coordinator.register({ id: 'order-saga', name: 'Order Processing', steps: [{ name: 'reserve', action: 'Reserve inventory', compensation: 'Release inventory', timeoutMs: 5000 }] })
    await coordinator.start('order-saga', 'order-1')
    const complete = await coordinator.completeStep('order-1', 'reserve')
    expect(complete).toBe(true)
  })
})
