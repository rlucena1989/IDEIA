import type { MemoryRecord } from '@ideia/contracts';
import { createLogger } from '@ideia/logger';
const logger = createLogger('memory-index');

export function buildMemoryIndex(records: MemoryRecord[]): Record<string, number> {
  const index: Record<string, number> = {};

  for (const record of records) {
    for (const tag of record.tags) {
      index[tag] = (index[tag] ?? 0) + 1;
    }
  }

  return index;
}
