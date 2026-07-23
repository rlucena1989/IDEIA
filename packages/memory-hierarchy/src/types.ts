export type MemoryLevel = 'working' | 'project' | 'institutional' | 'global';
export type EntryCategory = 'decision' | 'pattern' | 'architecture' | 'error' | 'preference' | 'policy' | 'event' | 'lesson' | 'observation';
export type EntryStatus = 'active' | 'archived' | 'pending_review' | 'promoted';

export interface MemoryEntry {
  id: string;
  level: MemoryLevel;
  category: EntryCategory;
  content: string;
  source: string;
  tags: string[];
  confidence: number;
  createdAt: string;
  updatedAt: string;
  accessCount: number;
  lastAccessed: string;
  ttlMs: number;
  status: EntryStatus;
  metadata: Record<string, unknown>;
}

export interface RetentionPolicy {
  level: MemoryLevel;
  maxEntries: number;
  defaultTtlMs: number;
  autoArchiveAfterMs: number;
  archiveOnAccessThreshold: number;
  allowedCategories: EntryCategory[];
}

export interface PromotionRule {
  fromLevel: MemoryLevel;
  toLevel: MemoryLevel;
  minAccessCount: number;
  minConfidence: number;
  requiredTags?: string[];
}

export interface HierarchySummary {
  level: MemoryLevel;
  totalEntries: number;
  activeEntries: number;
  archivedEntries: number;
  oldestEntry: string | null;
  newestEntry: string | null;
}
