import { AggregateRepository } from '../aggregate-repo'
import { DomainEvent } from '../types'

describe('AggregateRepository', () => {
  let repo: AggregateRepository
  beforeEach(() => { repo = new AggregateRepository() })

  it('should append and read events', () => {
    repo.append('order-1', { id: 'e1', aggregateId: 'order-1', type: 'OrderCreated', data: { id: 1 }, version: 1, timestamp: '' })
    const events = repo.readEvents('order-1')
    expect(events.length).toBe(1)
  })

  it('should save and load snapshots', () => {
    repo.saveSnapshot('order-1', { status: 'created' }, 1)
    const snap = repo.loadSnapshot('order-1')
    expect(snap!.state).toEqual({ status: 'created' })
  })

  it('should rebuild aggregate state', () => {
    repo.append('inv-1', { id: 'e1', aggregateId: 'inv-1', type: 'ItemAdded', data: { sku: 'A1', qty: 10 }, version: 1, timestamp: '' })
    repo.append('inv-1', { id: 'e2', aggregateId: 'inv-1', type: 'ItemRemoved', data: { sku: 'A1', qty: 3 }, version: 2, timestamp: '' })
    const result = repo.rebuild('inv-1', { items: {} }, {
      ItemAdded: (state: any, e: DomainEvent) => { const d = e.data as any; state.items[d.sku] = (state.items[d.sku] || 0) + d.qty; return state },
      ItemRemoved: (state: any, e: DomainEvent) => { const d = e.data as any; state.items[d.sku] = (state.items[d.sku] || 0) - d.qty; return state },
    })
    expect(result.eventsApplied).toBe(2)
    expect((result.state as any).items['A1']).toBe(7)
  })
})
