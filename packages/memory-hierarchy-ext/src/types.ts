export type MemoryLevel = 'L1_working' | 'L2_project' | 'L3_institutional' | 'L4_archive' | 'L5_ephemeral'
export interface MemoryEntry { id: string; level: MemoryLevel; content: string; importance: number; ttl: number; accessCount: number; lastAccessed: string; createdAt: string }
export interface PromotionRule { condition: string; fromLevel: MemoryLevel; toLevel: MemoryLevel; threshold: number }
export interface RetentionPolicy { level: MemoryLevel; maxEntries: number; ttlDays: number; evictionStrategy: 'lru' | 'lfu' | 'fifo' | 'importance' }
export interface MemoryStats { entriesByLevel: Record<MemoryLevel, number>; totalEntries: number; avgImportance: number; oldestEntry: string; newestEntry: string }
