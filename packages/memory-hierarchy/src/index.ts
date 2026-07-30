export { MemoryHierarchy } from './hierarchy';
export { WorkingMemory } from './working-memory';
export { ProjectMemory } from './project-memory';
export { InstitutionalMemory } from './institutional-memory';
export { GlobalMemory } from './global-memory';
export { MemoryCurator } from './curator';

export type {
  MemoryLevel,
  EntryCategory,
  EntryStatus,
  MemoryEntry,
  RetentionPolicy,
  PromotionRule,
  HierarchySummary,
} from './types';

import { MemoryHierarchy } from './hierarchy';
import { createLogger } from '@ideia/logger';
const logger = createLogger('index');

export function createMemoryHierarchy(): MemoryHierarchy {
  return new MemoryHierarchy();
}
