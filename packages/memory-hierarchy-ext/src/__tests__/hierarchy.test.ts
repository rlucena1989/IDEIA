import { HierarchyManager } from '../hierarchy-manager'

describe('HierarchyManager', () => {
  let mgr: HierarchyManager
  beforeEach(() => { mgr = new HierarchyManager() })

  it('should add entries to memory level', () => {
    mgr.addEntry({ id: 'mem1', level: 'L1_working', content: 'data', importance: 5, ttl: 1, accessCount: 0, lastAccessed: new Date().toISOString(), createdAt: new Date().toISOString() })
    expect(mgr.getByLevel('L1_working').length).toBe(1)
  })

  it('should track access count', () => {
    mgr.addEntry({ id: 'm1', level: 'L2_project', content: 'data', importance: 3, ttl: 90, accessCount: 0, lastAccessed: '', createdAt: '' })
    mgr.access('m1')
    expect(mgr.access('m1')!.accessCount).toBe(2)
  })

  it('should promote entries', () => {
    mgr.addEntry({ id: 'm1', level: 'L5_ephemeral', content: 'important', importance: 9, ttl: 0, accessCount: 0, lastAccessed: '', createdAt: '' })
    mgr.promote('m1', 'L2_project')
    expect(mgr.getByLevel('L2_project').length).toBe(1)
  })

  it('should provide stats', () => {
    mgr.addEntry({ id: 'm1', level: 'L1_working', content: 'a', importance: 8, ttl: 1, accessCount: 5, lastAccessed: '', createdAt: new Date().toISOString() })
    mgr.addEntry({ id: 'm2', level: 'L2_project', content: 'b', importance: 3, ttl: 90, accessCount: 1, lastAccessed: '', createdAt: new Date().toISOString() })
    const stats = mgr.getStats()
    expect(stats.totalEntries).toBe(2)
    expect(stats.avgImportance).toBe(5.5)
  })
})
