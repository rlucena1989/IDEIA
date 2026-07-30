import { SchemaEntry, SchemaMetadata, SchemaRegistrySnapshot } from './types';
import { createLogger } from '@ideia/logger';

const log = createLogger('schema-registry:registry');

export class SchemaRegistry {
  private schemas: Map<string, SchemaEntry> = new Map();

  register(schema: SchemaEntry): void {
    this.schemas.set(schema.id, schema);
    log.info(`Schema registered: ${schema.id}`);
  }

  registerMany(schemas: SchemaEntry[]): void {
    for (const s of schemas) this.register(s);
  }

  get(id: string): SchemaEntry | undefined {
    return this.schemas.get(id);
  }

  has(id: string): boolean {
    return this.schemas.has(id);
  }

  getAll(): SchemaEntry[] {
    return Array.from(this.schemas.values());
  }

  getByDomain(domain: string): SchemaEntry[] {
    return this.getAll().filter(s => s.id.startsWith(domain));
  }

  getByType(type: SchemaEntry['format']): SchemaEntry[] {
    return this.getAll().filter(s => s.format === type);
  }

  remove(id: string): boolean {
    return this.schemas.delete(id);
  }

  count(): number {
    return this.schemas.size;
  }

  snapshot(): SchemaRegistrySnapshot {
    return {
      schemas: this.getAll() as unknown as SchemaMetadata[],
      generatedAt: new Date().toISOString(),
      version: '1.0',
    };
  }

  clear(): void {
    this.schemas.clear();
    log.info('Schema registry cleared');
  }
}

export function createSchemaRegistry(): SchemaRegistry {
  return new SchemaRegistry();
}
