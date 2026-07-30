import { ProjectionEngine } from '../projection-engine'

describe('ProjectionEngine', () => {
  let engine: ProjectionEngine
  beforeEach(() => {
    engine = new ProjectionEngine()
    engine.register({ name: 'user-stats', handlers: { UserCreated: (state: any) => { state.totalUsers = (state.totalUsers || 0) + 1; return state } }, state: { totalUsers: 0 } })
  })

  it('should process events through projections', () => {
    const results = engine.process({ id: 'e1', type: 'UserCreated', data: { name: 'Alice' }, timestamp: '', streamId: 's1' })
    expect(results.length).toBe(1)
    expect(results[0].success).toBe(true)
  })

  it('should update read model state', () => {
    engine.process({ id: 'e1', type: 'UserCreated', data: { name: 'Alice' }, timestamp: '', streamId: 's1' })
    engine.process({ id: 'e2', type: 'UserCreated', data: { name: 'Bob' }, timestamp: '', streamId: 's1' })
    const state = engine.getState<{ totalUsers: number }>('user-stats')
    expect(state!.totalUsers).toBe(2)
  })

  it('should process batch of events', () => {
    const events = [
      { id: 'e1', type: 'UserCreated', data: {}, timestamp: '', streamId: 's1' },
      { id: 'e2', type: 'UserCreated', data: {}, timestamp: '', streamId: 's1' },
    ]
    const results = engine.processBatch(events)
    expect(results.length).toBe(2)
  })
})
