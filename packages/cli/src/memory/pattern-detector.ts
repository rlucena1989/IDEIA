import type { MemoryRecord, MemoryPattern } from '@ideia/contracts';

export function detectPatterns(records: MemoryRecord[]): MemoryPattern[] {
  const counts = new Map<string, number>();

  for (const record of records) {
    for (const tag of record.tags) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }

  return [...counts.entries()]
    .filter(([, count]) => count >= 2)
    .map(([tag, count]) => ({
      patternId: `pattern-${tag}-${Date.now()}`,
      name: tag,
      frequency: count,
      confidence: Math.min(1, 0.5 + count * 0.1),
      description: `Repeated pattern detected for tag "${tag}".`,
      detectedAt: new Date().toISOString(),
    }));
}
