import { injectable, inject, postConstruct } from '@theia/core/shared/inversify';
import { createLogger } from '@ideia/logger';
import * as fs from 'fs';
import * as path from 'path';
import { EventBus } from '@ideia/event-bus';
import { IDEIA_MemoryService } from '../common/ideia-protocol';

interface MemoryEntry {
  key: string;
  value: unknown;
  timestamp: string;
  embedding?: number[];
}

@injectable()
export class IDEIA_MemoryBackendService implements IDEIA_MemoryService {
  private memoryStore = new Map<string, MemoryEntry>();
  private storePath: string;

  constructor(
    @inject(EventBus) private eventBus: EventBus,
  ) {
    this.storePath = process.env.IDEIA_MEMORY_PATH || path.join(process.cwd(), '.ideia', 'memory.json');
  }

  @postConstruct()
  async load(): Promise<void> {
    try {
      if (fs.existsSync(this.storePath)) {
        const data = JSON.parse(fs.readFileSync(this.storePath, 'utf-8')) as MemoryEntry[];
        for (const entry of data) {
          this.memoryStore.set(entry.key, entry);
        }
      }
    } catch {
      /* start with empty store */
    }
  }

  async store(key: string, value: unknown): Promise<void> {
    const entry: MemoryEntry = {
      key,
      value,
      timestamp: new Date().toISOString(),
    };
    this.memoryStore.set(key, entry);
    await this.persist();
  }

  async retrieve(key: string): Promise<unknown> {
    return this.memoryStore.get(key)?.value;
  }

  async search(query: string, limit = 10): Promise<Array<{ key: string; value: unknown; score: number }>> {
    const queryLower = query.toLowerCase();
    const results: Array<{ key: string; value: unknown; score: number }> = [];

    for (const [key, entry] of this.memoryStore) {
      const keyMatch = key.toLowerCase().includes(queryLower);
      const valueStr = JSON.stringify(entry.value).toLowerCase();
      const valueMatch = valueStr.includes(queryLower);

      if (keyMatch || valueMatch) {
        let score = 0;
        if (keyMatch) score += 1;
        if (valueMatch) score += 0.5;
        if (key === query) score += 2;

        results.push({ key, value: entry.value, score });
      }
    }

    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  async delete(key: string): Promise<void> {
    this.memoryStore.delete(key);
    await this.persist();
  }

  async list(prefix?: string): Promise<string[]> {
    const keys = Array.from(this.memoryStore.keys());
    if (prefix) return keys.filter(k => k.startsWith(prefix));
    return keys;
  }

  private async persist(): Promise<void> {
    try {
      const dir = path.dirname(this.storePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const data = Array.from(this.memoryStore.values());
      fs.writeFileSync(this.storePath, JSON.stringify(data, null, 2), 'utf-8');
    } catch {
      /* silent persist failure */
    }
  }
}
