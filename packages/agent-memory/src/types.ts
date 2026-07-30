export type MemoryLevel = 'l0_context' | 'l1_cache' | 'l2_cache' | 'l3_working' | 'l4_episodic' | 'l5_semantic' | 'l6_persistent'

export type EntryCategory = 'decision' | 'pattern' | 'architecture' | 'error' | 'preference' | 'policy' | 'event' | 'lesson' | 'observation'

export type EntryStatus = 'active' | 'archived' | 'pending_review' | 'promoted'

export interface MemoryEntry {
  id: string
  level: MemoryLevel
  category: EntryCategory
  content: string
  source: string
  tags: string[]
  confidence: number
  importance: number
  createdAt: string
  updatedAt: string
  accessCount: number
  lastAccessed: string
  ttlMs: number
  status: EntryStatus
  metadata: Record<string, unknown>
  embedding?: Float64Array
  parentId?: string
}

export interface ConsolidationReport {
  timestamp: number
  memoriesProcessed: number
  memoriesPromoted: number
  patternsExtracted: number
  promoted: Array<{ content: string; from: string; to: string; reason: string }>
  patterns: Array<{ pattern: string; frequency: number }>
  replayed: number
  durationMs: number
  consolidated?: number
  archived?: number
  removed?: number
  tiersBalanced?: boolean
}

export interface CompressedMemory {
  originalLength: number
  compressedLength: number
  ratio: number
  summary: string
  signature: string
  original?: MemoryEntry[]
  entries?: MemoryEntry[]
  archived?: MemoryEntry[]
}

export interface HierarchicalResult {
  query: string
  topK: number
  results: Array<{ content: string; tier: string; score: number }>
  byTier: Map<string, Array<{ content: string; score: number }>>
  attentionDistribution: Record<string, number>
  totalCandidates: number
  entries?: Array<{ content: string; tier: string; score: number }>
}

export interface MemoryTier {
  name: string
  search(query: string, limit: number): Promise<Array<{ content: string; score: number }>>
}
