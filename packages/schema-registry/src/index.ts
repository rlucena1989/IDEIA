export { SchemaRegistry, createSchemaRegistry } from './schema-registry';
export type { SchemaRegistrySnapshot } from './schema-registry';
export { SchemaDiscovery, createSchemaDiscovery } from './discovery';
export { SchemaCache, createSchemaCache } from './cache';
export * from './types';

// CLI convenience
export function createCliSchema(name: string, data: Record<string, unknown>): { name: string; data: Record<string, unknown> } {
  return { name, data };
}
