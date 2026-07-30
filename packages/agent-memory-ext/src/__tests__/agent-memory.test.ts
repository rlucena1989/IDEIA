import { AgentMemoryManager } from '../agent-memory'

describe('AgentMemoryManager', () => {
  let mgr: AgentMemoryManager
  beforeEach(() => { mgr = new AgentMemoryManager() })

  it('should store and retrieve entries', () => {
    mgr.store({ id: 'm1', agentId: 'agent1', key: 'last-task', value: 'login', importance: 5, ttl: 3600, createdAt: new Date().toISOString(), lastAccessed: '' })
    const entry = mgr.retrieve('agent1', 'last-task')
    expect(entry!.value).toBe('login')
  })

  it('should get all entries by agent', () => {
    mgr.store({ id: 'm1', agentId: 'a1', key: 'k1', value: 'v1', importance: 3, ttl: 100, createdAt: '', lastAccessed: '' })
    mgr.store({ id: 'm2', agentId: 'a1', key: 'k2', value: 'v2', importance: 8, ttl: 100, createdAt: '', lastAccessed: '' })
    mgr.store({ id: 'm3', agentId: 'a2', key: 'k3', value: 'v3', importance: 5, ttl: 100, createdAt: '', lastAccessed: '' })
    expect(mgr.getByAgent('a1').length).toBe(2)
  })

  it('should generate agent profile', () => {
    mgr.store({ id: 'm1', agentId: 'a1', key: 'high', value: 'x', importance: 9, ttl: 100, createdAt: '', lastAccessed: '' })
    mgr.store({ id: 'm2', agentId: 'a1', key: 'low', value: 'y', importance: 1, ttl: 100, createdAt: '', lastAccessed: '' })
    const profile = mgr.getProfile('a1')
    expect(profile.totalEntries).toBe(2)
    expect(profile.topKeys[0]).toBe('high')
  })

  it('should consolidate old low-importance entries', () => {
    mgr.store({ id: 'm1', agentId: 'a1', key: 'old', value: 'x', importance: 1, ttl: -1, createdAt: new Date(Date.now() - 10000).toISOString(), lastAccessed: '' })
    const result = mgr.consolidate('a1')
    expect(result.removed).toContain('old')
  })

  it('should share memory between agents', () => {
    mgr.store({ id: 'm1', agentId: 'source', key: 'shared-key', value: 'data', importance: 5, ttl: 100, createdAt: '', lastAccessed: '' })
    mgr.share('source', 'target', ['shared-key'])
    const entry = mgr.retrieve('target', 'shared-key')
    expect(entry).toBeDefined()
  })
})
