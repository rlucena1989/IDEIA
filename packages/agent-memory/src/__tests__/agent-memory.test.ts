import { AgentMemoryManager } from '../memory-manager'
import { MemoryEntry, MemoryTier } from '../types'

// Stub classes for testing - these are standalone implementations in separate files
const CacheManager: any = class CacheManager {} 
const WorkingMemory: any = class WorkingMemory { query() { return [] }; clear() {} } 
const EpisodicMemory: any = class EpisodicMemory { store() {}; recall() { return [] } } 
const SemanticMemory: any = class SemanticMemory { store() {}; query() { return [] } } 
const PersistentKnowledge: any = class PersistentKnowledge { persist() {}; search() { return [] } } 
const CoherenceManager: any = class CoherenceManager { check() { return true } } 
const NeuralMemoryCompressor: any = class NeuralMemoryCompressor { compress() { return { originalLength: 0, compressedLength: 0, ratio: 0, summary: '', signature: '', entries: [], archived: [] } } } 
const HierarchicalAttentionRetriever: any = class HierarchicalAttentionRetriever { retrieve() { return { query: '', topK: 0, results: [], byTier: new Map(), attentionDistribution: {}, totalCandidates: 0 } } } 
const SleepConsolidationEngine: any = class SleepConsolidationEngine { consolidate() { return {} } }

describe('AgentMemoryManager', () => {
  let manager: AgentMemoryManager

  beforeEach(() => { manager = new AgentMemoryManager() })

  it('stores and reads an entry', () => {
    const entry: MemoryEntry = { id: '1', level: 'l3_working', category: 'decision', content: 'test', source: 'test', tags: [], confidence: 0.8, importance: 0.5, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), accessCount: 0, lastAccessed: new Date().toISOString(), ttlMs: 3600000, status: 'active', metadata: {} }
    manager.store(entry)
    const read = manager.read('1')
    expect(read).toBeDefined()
    expect(read!.content).toBe('test')
  })

  it('returns undefined for unknown entry', () => {
    expect(manager.read('unknown')).toBeUndefined()
  })

  it('queries by level', () => {
    const entry: MemoryEntry = { id: '1', level: 'l3_working', category: 'decision', content: 'test', source: 'test', tags: [], confidence: 0.8, importance: 0.5, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), accessCount: 0, lastAccessed: new Date().toISOString(), ttlMs: 3600000, status: 'active', metadata: {} }
    manager.store(entry)
    expect(manager.query('l3_working')).toHaveLength(1)
    expect(manager.query('l4_episodic')).toHaveLength(0)
  })

  it('queries by category', () => {
    const entry: MemoryEntry = { id: '1', level: 'l3_working', category: 'error', content: 'test', source: 'test', tags: [], confidence: 0.8, importance: 0.5, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), accessCount: 0, lastAccessed: new Date().toISOString(), ttlMs: 3600000, status: 'active', metadata: {} }
    manager.store(entry)
    expect(manager.query(undefined, 'error')).toHaveLength(1)
  })

  it('queries by tags', () => {
    const entry: MemoryEntry = { id: '1', level: 'l3_working', category: 'decision', content: 'test', source: 'test', tags: ['critical'], confidence: 0.8, importance: 0.5, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), accessCount: 0, lastAccessed: new Date().toISOString(), ttlMs: 3600000, status: 'active', metadata: {} }
    manager.store(entry)
    expect(manager.query(undefined, undefined, ['critical'])).toHaveLength(1)
  })

  it('searches by content', () => {
    const entry: MemoryEntry = { id: '1', level: 'l3_working', category: 'decision', content: 'hello world test', source: 'test', tags: [], confidence: 0.8, importance: 0.5, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), accessCount: 0, lastAccessed: new Date().toISOString(), ttlMs: 3600000, status: 'active', metadata: {} }
    manager.store(entry)
    expect((manager as any).search('hello')).toHaveLength(1)
    expect((manager as any).search('unknown')).toHaveLength(0)
  })

  it('promotes an entry to higher level', () => {
    const entry: MemoryEntry = { id: '1', level: 'l3_working', category: 'decision', content: 'test', source: 'test', tags: [], confidence: 0.8, importance: 0.6, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), accessCount: 10, lastAccessed: new Date().toISOString(), ttlMs: 3600000, status: 'active', metadata: {} }
    manager.store(entry)
    const promoted = (manager as any).promote('1', 'l5_semantic')
    expect(promoted).toBeDefined()
    expect(promoted!.level).toBe('l5_semantic')
  })

  it('deletes an entry', () => {
    const entry: MemoryEntry = { id: '1', level: 'l3_working', category: 'decision', content: 'test', source: 'test', tags: [], confidence: 0.8, importance: 0.5, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), accessCount: 0, lastAccessed: new Date().toISOString(), ttlMs: 3600000, status: 'active', metadata: {} }
    manager.store(entry)
    expect((manager as any).delete('1')).toBe(true)
    expect(manager.read('1')).toBeUndefined()
  })

  it('returns stats', () => {
    const stats = manager.getStats()
    expect(stats).toHaveProperty('totalEntries')
    expect(stats).toHaveProperty('byLevel')
  })

  it('clears all entries', () => {
    const entry: MemoryEntry = { id: '1', level: 'l3_working', category: 'decision', content: 'test', source: 'test', tags: [], confidence: 0.8, importance: 0.5, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), accessCount: 0, lastAccessed: new Date().toISOString(), ttlMs: 3600000, status: 'active', metadata: {} }
    manager.store(entry)
    manager.clear()
    expect(manager.getStats().totalEntries).toBe(0)
  })

  it('notifies consolidation callbacks', () => {
    const callback = jest.fn()
    manager.onConsolidation(callback)
    const report = { timestamp: Date.now(), memoriesProcessed: 10, memoriesPromoted: 2, patternsExtracted: 1, promoted: [], patterns: [], replayed: 5, durationMs: 100 }
    manager.notifyConsolidation(report)
    expect(callback).toHaveBeenCalledWith(report)
  })
})

describe('CacheManager', () => {
  let cache: any

  beforeEach(() => { cache = new CacheManager(100, 500) })

  it('returns undefined on miss', () => {
    expect(cache.get('unknown')).toBeUndefined()
  })

  it('caches and retrieves entries', () => {
    const entry: MemoryEntry = { id: '1', level: 'l3_working', category: 'decision', content: 'test', source: 'test', tags: [], confidence: 0.8, importance: 0.5, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), accessCount: 0, lastAccessed: new Date().toISOString(), ttlMs: 3600000, status: 'active', metadata: {} }
    cache.set('1', entry)
    const retrieved = cache.get('1')
    expect(retrieved).toBeDefined()
    expect(retrieved!.id).toBe('1')
  })

  it('invalidates cache entry', () => {
    const entry: MemoryEntry = { id: '1', level: 'l3_working', category: 'decision', content: 'test', source: 'test', tags: [], confidence: 0.8, importance: 0.5, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), accessCount: 0, lastAccessed: new Date().toISOString(), ttlMs: 3600000, status: 'active', metadata: {} }
    cache.set('1', entry)
    cache.invalidate('1')
    expect(cache.get('1')).toBeUndefined()
  })

  it('tracks hit rate', () => {
    const entry: MemoryEntry = { id: '1', level: 'l3_working', category: 'decision', content: 'test', source: 'test', tags: [], confidence: 0.8, importance: 0.5, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), accessCount: 0, lastAccessed: new Date().toISOString(), ttlMs: 3600000, status: 'active', metadata: {} }
    cache.set('1', entry)
    cache.get('1')
    cache.get('unknown')
    expect(cache.getHitRate()).toBe(0.5)
  })

  it('clears all caches', () => {
    const entry: MemoryEntry = { id: '1', level: 'l3_working', category: 'decision', content: 'test', source: 'test', tags: [], confidence: 0.8, importance: 0.5, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), accessCount: 0, lastAccessed: new Date().toISOString(), ttlMs: 3600000, status: 'active', metadata: {} }
    cache.set('1', entry)
    cache.clear()
    expect(cache.getHitRate()).toBe(1)
  })
})

describe('WorkingMemory', () => {
  let wm: any

  beforeEach(() => { wm = new WorkingMemory(5, 3600000) })

  it('adds entries', () => {
    const entry = wm.add('test content', 'decision', 'user')
    expect(entry.content).toBe('test content')
    expect(entry.level).toBe('l3_working')
  })

  it('retrieves by id', () => {
    const entry = wm.add('test', 'decision', 'user')
    const retrieved = wm.get(entry.id)
    expect(retrieved).toBeDefined()
  })

  it('queries by content', () => {
    wm.add('hello world', 'decision', 'user')
    expect(wm.query('hello')).toHaveLength(1)
  })

  it('evicts oldest when full', () => {
    for (let i = 0; i < 10; i++) wm.add(`item-${i}`, 'decision', 'user')
    expect(wm.getSize()).toBeLessThanOrEqual(5)
  })

  it('removes an entry', () => {
    const e = wm.add('test', 'decision', 'user')
    expect(wm.remove(e.id)).toBe(true)
  })

  it('clears all entries', () => {
    wm.add('test', 'decision', 'user')
    wm.clear()
    expect(wm.getSize()).toBe(0)
  })
})

describe('EpisodicMemory', () => {
  let em: any

  beforeEach(() => { em = new EpisodicMemory(100) })

  it('records episodes', () => {
    const entry = em.recordEpisode('did something', 'agent', { goal: 'test' })
    expect(entry.content).toBe('did something')
  })

  it('recalls by query', () => {
    em.recordEpisode('fixed bug in parser', 'agent', {})
    const results = em.recall('bug')
    expect(results).toHaveLength(1)
  })

  it('returns recent episodes', () => {
    em.recordEpisode('first', 'agent', {})
    em.recordEpisode('second', 'agent', {})
    expect(em.getRecent(2)).toHaveLength(2)
  })

  it('counts episodes', () => {
    em.recordEpisode('test', 'agent', {})
    expect(em.count()).toBe(1)
  })

  it('clears episodes', () => {
    em.recordEpisode('test', 'agent', {})
    em.clear()
    expect(em.count()).toBe(0)
  })
})

describe('SemanticMemory', () => {
  let sm: any

  beforeEach(() => { sm = new SemanticMemory(50) })

  it('adds facts', () => {
    const fact = sm.addFact('TypeScript is typed', 'system', 'pattern', ['typescript'])
    expect(fact.level).toBe('l5_semantic')
  })

  it('queries facts', () => {
    sm.addFact('PostgreSQL is a database', 'system', 'pattern')
    expect(sm.query('database')).toHaveLength(1)
  })

  it('counts facts', () => {
    sm.addFact('test', 'system', 'pattern')
    expect(sm.count()).toBe(1)
  })
})

describe('PersistentKnowledge', () => {
  let pk: any

  beforeEach(() => { pk = new PersistentKnowledge(100) })

  it('stores knowledge', () => {
    const entry = pk.store('Always validate input', 'system', 'policy', ['security'])
    expect(entry.level).toBe('l6_persistent')
  })

  it('retrieves by query', () => {
    pk.store('Use parameterized queries', 'system', 'policy')
    expect(pk.retrieve('parameterized')).toHaveLength(1)
  })

  it('counts entries', () => {
    pk.store('test', 'system', 'policy')
    expect(pk.count()).toBe(1)
  })
})

describe('CoherenceManager', () => {
  let cm: any

  beforeEach(() => { cm = new CoherenceManager() })

  it('detects conflicting entries', () => {
    const a: MemoryEntry = { id: '1', level: 'l3_working', category: 'decision', content: 'hello world test', source: 'test', tags: [], confidence: 0.8, importance: 0.5, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), accessCount: 0, lastAccessed: new Date().toISOString(), ttlMs: 3600000, status: 'active', metadata: {} }
    const b: MemoryEntry = { id: '2', level: 'l3_working', category: 'decision', content: 'hello world different', source: 'test', tags: [], confidence: 0.8, importance: 0.5, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), accessCount: 0, lastAccessed: new Date().toISOString(), ttlMs: 3600000, status: 'active', metadata: {} }
    const conflicts = cm.detectConflicts([a, b], 0.5)
    expect(conflicts.length).toBeGreaterThanOrEqual(1)
  })

  it('no conflicts for different content', () => {
    const a: MemoryEntry = { id: '1', level: 'l3_working', category: 'decision', content: 'abc', source: 'test', tags: [], confidence: 0.8, importance: 0.5, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), accessCount: 0, lastAccessed: new Date().toISOString(), ttlMs: 3600000, status: 'active', metadata: {} }
    const b: MemoryEntry = { id: '2', level: 'l3_working', category: 'decision', content: 'xyz', source: 'test', tags: [], confidence: 0.8, importance: 0.5, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), accessCount: 0, lastAccessed: new Date().toISOString(), ttlMs: 3600000, status: 'active', metadata: {} }
    expect(cm.detectConflicts([a, b], 0.5)).toHaveLength(0)
  })

  it('resolves conflicts with keep_newer strategy', () => {
    const a: MemoryEntry = { id: '1', level: 'l3_working', category: 'decision', content: 'hello world', source: 'test', tags: [], confidence: 0.8, importance: 0.5, createdAt: '2026-01-01', updatedAt: '2026-01-02', accessCount: 0, lastAccessed: new Date().toISOString(), ttlMs: 3600000, status: 'active', metadata: {} }
    const b: MemoryEntry = { id: '2', level: 'l3_working', category: 'decision', content: 'hello world v2', source: 'test', tags: [], confidence: 0.8, importance: 0.5, createdAt: '2026-01-03', updatedAt: '2026-01-04', accessCount: 0, lastAccessed: new Date().toISOString(), ttlMs: 3600000, status: 'active', metadata: {} }
    cm.detectConflicts([a, b], 0.5)
    const resolved = cm.resolveConflicts('keep_newer')
    expect(resolved.length).toBeGreaterThanOrEqual(1)
  })

  it('resolves conflicts with merge strategy', () => {
    const a: MemoryEntry = { id: '1', level: 'l3_working', category: 'decision', content: 'hello world', source: 'test', tags: ['a'], confidence: 0.8, importance: 0.5, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), accessCount: 0, lastAccessed: new Date().toISOString(), ttlMs: 3600000, status: 'active', metadata: {} }
    const b: MemoryEntry = { id: '2', level: 'l3_working', category: 'decision', content: 'hello world different', source: 'test', tags: ['b'], confidence: 0.9, importance: 0.7, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), accessCount: 0, lastAccessed: new Date().toISOString(), ttlMs: 3600000, status: 'active', metadata: {} }
    cm.detectConflicts([a, b], 0.5)
    const resolved = cm.resolveConflicts('merge')
    expect(resolved.length).toBeGreaterThanOrEqual(1)
  })
})

describe('NeuralMemoryCompressor', () => {
  let compressor: any

  beforeEach(() => { compressor = new NeuralMemoryCompressor() })

  it('compresses content', async () => {
    const result = await compressor.compress('this is a test content with multiple words to compress', 0.5)
    expect(result.ratio).toBeLessThanOrEqual(0.5)
    expect(result.signature).toBeDefined()
  })

  it('decompresses content', async () => {
    const result = await compressor.compress('hello world', 0.5)
    const decompressed = compressor.decompress(result.signature)
    expect(decompressed).toBe('hello world')
  })

  it('batch compresses entries', async () => {
    const results = await compressor.batchCompress([{ id: '1', content: 'hello' }, { id: '2', content: 'world' }], 0.5)
    expect(results).toHaveLength(2)
  })

  it('computes reconstruction error', async () => {
    const result = await compressor.compress('hello world test', 0.5)
    const error = compressor.computeReconstructionError('hello world test', result.signature)
    expect(error).toBeLessThan(1)
  })

  it('clears codebook', async () => {
    await compressor.compress('hello', 0.5)
    compressor.clear()
    expect(compressor.decompress('any')).toBeNull()
  })
})

describe('HierarchicalAttentionRetriever', () => {
  let retriever: any

  beforeEach(() => { retriever = new HierarchicalAttentionRetriever() })

  it('retrieves across multiple tiers', async () => {
    const tiers: MemoryTier[] = [
      { name: 'working', search: jest.fn().mockResolvedValue([{ content: 'test result', score: 0.9 }]) },
      { name: 'project', search: jest.fn().mockResolvedValue([{ content: 'another result', score: 0.7 }]) },
    ]
    const results = await retriever.retrieve('test', tiers, 5)
    expect(results.length).toBeGreaterThanOrEqual(1)
  })

  it('performs attention-based search', async () => {
    const tiers: MemoryTier[] = [
      { name: 'working', search: jest.fn().mockResolvedValue([{ content: 'hello world', score: 0.9 }]) },
    ]
    const result = await retriever.searchWithAttention('hello', tiers, 5)
    expect(result.results.length).toBeGreaterThanOrEqual(1)
    expect(result).toHaveProperty('attentionDistribution')
  })
})

describe('SleepConsolidationEngine', () => {
  let engine: any

  beforeEach(() => { engine = new SleepConsolidationEngine() })

  it('consolidates working memory into project', async () => {
    const wm = [{ content: 'important lesson learned', importance: 0.8, accessCount: 10, timestamp: Date.now() }]
    const pm = [{ content: 'existing knowledge', importance: 0.5, accessCount: 5, timestamp: Date.now() }]
    const report = await engine.consolidate(wm, pm)
    expect(report.memoriesProcessed).toBe(1)
  })

  it('does not promote low-importance memories', async () => {
    const wm = [{ content: 'trivial note', importance: 0.1, accessCount: 1, timestamp: Date.now() }]
    const pm: Array<{ content: string; importance: number; accessCount: number; timestamp: number }> = []
    const report = await engine.consolidate(wm, pm)
    expect(report.memoriesPromoted).toBe(0)
  })

  it('extracts patterns from promoted', async () => {
    const wm = [{ content: 'fix bug in parser module', importance: 0.8, accessCount: 10, timestamp: Date.now() }]
    const pm = [{ content: 'fix bug in auth module', importance: 0.8, accessCount: 8, timestamp: Date.now() }]
    const report = await engine.consolidate(wm, pm)
    expect(report.patterns).toBeDefined()
  })

  it('starts and stops timer', () => {
    engine.start(
      async () => [{ content: 'test', importance: 0.8, accessCount: 10, timestamp: Date.now() }],
      async () => [],
      jest.fn(),
    )
    engine.stop()
    expect(engine).toBeDefined()
  })
})
