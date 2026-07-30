import { GoldenPath } from './types';
import { createLogger } from '@ideia/logger';
const logger = createLogger('golden-paths');

export class GoldenPathRegistry {
  private paths: Map<string, GoldenPath> = new Map();

  register(path: GoldenPath): void { this.paths.set(path.id, path); }

  get(id: string): GoldenPath | undefined { return this.paths.get(id); }

  list(): GoldenPath[] { return Array.from(this.paths.values()); }

  search(query: string): GoldenPath[] {
    const q = query.toLowerCase();
    return Array.from(this.paths.values()).filter(p => p.name.toLowerCase().includes(q) || p.tags.some(t => t.toLowerCase().includes(q)));
  }

  filterByCategory(category: string): GoldenPath[] { return Array.from(this.paths.values()).filter(p => p.category === category); }

  estimateTime(pathId: string): number | undefined { return this.paths.get(pathId)?.estimatedMinutes; }

  count(): number { return this.paths.size; }
}
