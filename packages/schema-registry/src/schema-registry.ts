import { randomUUID } from 'crypto';
import { createLogger } from '@ideia/logger';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import {
  SchemaEntry, SchemaFormat, SchemaStatus, SchemaVersionDiff,
  BreakingChange, ValidationResult, CompatibilityResult, CompatibilityMode, SchemaMetadata,
} from './types';

export interface SchemaRegistrySnapshot {
  schemas: [string, SchemaEntry][];
  history: [string, SchemaEntry[]][];
}

const DEFAULT_PERSIST_DIR = '.ai/schema-registry';

function extractFields(content: string): string[] {
  const fields: string[] = [];
  const fieldRegex = /\b(\w+)\s*:\s*(string|number|boolean|object|array|Record|unknown|any)\b/g;
  let match;
  while ((match = fieldRegex.exec(content)) !== null) {
    if (match[1]) fields.push(match[1]);
  }
  return fields;
}

function extractTypes(content: string): Record<string, string> {
  const types: Record<string, string> = {};
  const fieldRegex = /\b(\w+)\s*:\s*(string|number|boolean|object|array|Record|unknown|any)\b/g;
  let match;
  while ((match = fieldRegex.exec(content)) !== null) {
    if (match[1] && match[2]) types[match[1]] = match[2];
  }
  return types;
}

export class SchemaRegistry {
  private schemas: Map<string, SchemaEntry> = new Map();
  private history: Map<string, SchemaEntry[]> = new Map();
  private persistDir: string = DEFAULT_PERSIST_DIR;

  setPersistDir(dir: string): void {
    this.persistDir = dir;
  }

  registerSchema(name: string, version: number, schema: string, format?: SchemaFormat, description?: string, tags?: string[]): SchemaEntry {
    const allVersions = this.getVersionHistoryByName(name);
    const existing = allVersions.find(s => s.version === version);
    if (existing) {
      return this.update(existing.id, schema, existing.compatibility) || existing;
    }

    const entry: SchemaEntry = {
      id: randomUUID(),
      name,
      version,
      format: format ?? 'json',
      content: schema,
      status: 'active',
      description,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      tags: tags ?? [],
      compatibility: 'backward',
    };

    this.schemas.set(entry.id, entry);
    this.addToHistory(entry);
    return entry;
  }

  register(name: string, format: SchemaFormat, content: string, description?: string, tags?: string[]): SchemaEntry {
    const existing = Array.from(this.schemas.values()).find(s => s.name === name);
    if (existing) {
      return this.update(existing.id, content, existing.compatibility) || existing;
    }

    const schema: SchemaEntry = {
      id: randomUUID(),
      name,
      version: 1,
      format,
      content,
      status: 'draft',
      description,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      tags: tags ?? [],
      compatibility: 'backward',
    };

    this.schemas.set(schema.id, schema);
    this.addToHistory(schema);
    return schema;
  }

  update(id: string, content: string, compatibility?: SchemaEntry['compatibility']): SchemaEntry | null {
    const existing = this.schemas.get(id);
    if (!existing) return null;

    const oldVersion = existing.version;
    const updated: SchemaEntry = {
      ...existing,
      content,
      version: oldVersion + 1,
      status: 'active',
      updatedAt: new Date().toISOString(),
      compatibility: compatibility ?? existing.compatibility,
    };

    this.schemas.set(id, updated);
    this.addToHistory(updated);
    return updated;
  }

  get(id: string): SchemaEntry | undefined {
    return this.schemas.get(id);
  }

  getSchema(name: string, version?: number): SchemaEntry | undefined {
    const allVersions = this.getVersionHistoryByName(name);
    if (!version) return this.findByName(name);
    return allVersions.find(s => s.version === version);
  }

  getLatestVersion(name: string): SchemaEntry | undefined {
    const allVersions = this.getVersionHistoryByName(name);
    if (allVersions.length === 0) return undefined;
    return allVersions.reduce((a, b) => a.version > b.version ? a : b);
  }

  findByName(name: string): SchemaEntry | undefined {
    return Array.from(this.schemas.values()).find(s => s.name === name);
  }

  listSchemas(status?: SchemaStatus): SchemaEntry[] {
    let result = Array.from(this.schemas.values());
    if (status) result = result.filter(s => s.status === status);
    return result;
  }

  list(status?: SchemaStatus): SchemaEntry[] {
    return this.listSchemas(status);
  }

  getVersionHistory(schemaId: string): SchemaEntry[] {
    return this.history.get(schemaId) || [];
  }

  getVersionHistoryByName(name: string): SchemaEntry[] {
    const schema = this.findByName(name);
    if (!schema) return [];
    return this.getVersionHistory(schema.id);
  }

  listVersions(name: string): SchemaMetadata | null {
    const allVersions = this.getVersionHistoryByName(name);
    if (allVersions.length === 0) return null;
    const latest = allVersions.reduce((a, b) => a.version > b.version ? a : b);
    return {
      name,
      latestVersion: latest.version,
      totalVersions: allVersions.length,
      status: latest.status,
      format: latest.format,
      createdAt: allVersions[0].createdAt,
      tags: latest.tags,
    };
  }

  validateData(schema: SchemaEntry, data: Record<string, unknown>): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const fieldErrors: Record<string, string[]> = {};
    const schemaFields = extractFields(schema.content);
    const schemaTypes = extractTypes(schema.content);

    if (schemaFields.length > 0) {
      for (const field of schemaFields) {
        if (!(field in data) && !field.startsWith('_')) {
          errors.push(`Missing required field: ${field}`);
          fieldErrors[field] = fieldErrors[field] || [];
          fieldErrors[field].push('Missing required field');
        } else if (field in data && schemaTypes[field]) {
          const actualType = typeof data[field];
          const expectedType = schemaTypes[field];
          if (expectedType === 'string' && actualType !== 'string') {
            warnings.push(`Field '${field}' expected string, got ${actualType}`);
            fieldErrors[field] = fieldErrors[field] || [];
            fieldErrors[field].push(`Expected ${expectedType}, got ${actualType}`);
          } else if (expectedType === 'number' && actualType !== 'number') {
            errors.push(`Field '${field}' expected number, got ${actualType}`);
            fieldErrors[field] = fieldErrors[field] || [];
            fieldErrors[field].push(`Expected ${expectedType}, got ${actualType}`);
          }
        }
      }
    }

    return { valid: errors.length === 0, errors, warnings: warnings.length > 0 ? warnings : undefined, fieldErrors: Object.keys(fieldErrors).length > 0 ? fieldErrors : undefined };
  }

  validate(schemaName: string, data: Record<string, unknown>): ValidationResult {
    const schema = this.findByName(schemaName);
    if (!schema) return { valid: false, errors: [`Schema '${schemaName}' not found`] };
    return this.validateData(schema, data);
  }

  detectBreakingChanges(oldSchema: SchemaEntry, newSchema: SchemaEntry): BreakingChange[] {
    const breakingChanges: BreakingChange[] = [];
    const oldFields = extractFields(oldSchema.content);
    const newFields = extractFields(newSchema.content);
    const oldTypes = extractTypes(oldSchema.content);
    const newTypes = extractTypes(newSchema.content);

    const removedFields = oldFields.filter(f => !newFields.includes(f));
    for (const field of removedFields) {
      breakingChanges.push({
        type: 'field_removed',
        field,
        description: `Field '${field}' was removed`,
        severity: 'breaking',
      });
    }

    for (const field of oldFields) {
      if (newFields.includes(field) && oldTypes[field] && newTypes[field] && oldTypes[field] !== newTypes[field]) {
        breakingChanges.push({
          type: 'type_changed',
          field,
          description: `Field '${field}' type changed from ${oldTypes[field]} to ${newTypes[field]}`,
          severity: 'breaking',
        });
      }
    }

    const oldFormat = oldSchema.format;
    const newFormat = newSchema.format;
    if (oldFormat !== newFormat) {
      breakingChanges.push({
        type: 'format_changed',
        field: 'format',
        description: `Format changed from ${oldFormat} to ${newFormat}`,
        severity: 'breaking',
      });
    }

    if (oldSchema.name !== newSchema.name) {
      breakingChanges.push({
        type: 'name_changed',
        field: 'name',
        description: `Schema renamed from '${oldSchema.name}' to '${newSchema.name}'`,
        severity: 'breaking',
      });
    }

    const compat = newSchema.compatibility || 'none';
    if (compat === 'none') {
      breakingChanges.push({
        type: 'compatibility_none',
        field: 'compatibility',
        description: 'Schema has no compatibility guarantee',
        severity: 'warning',
      });
    }

    return breakingChanges;
  }

  isCompatible(consumer: SchemaEntry, provider: SchemaEntry): CompatibilityResult {
    const changes = this.detectBreakingChanges(provider, consumer);
    const mode = consumer.compatibility || provider.compatibility || 'none';

    let compatible = true;
    if (mode === 'backward') {
      compatible = !changes.some(c => c.type !== 'field_added' && c.severity === 'breaking');
    } else if (mode === 'forward') {
      compatible = !changes.some(c => c.type === 'field_removed' && c.severity === 'breaking');
    } else if (mode === 'full') {
      compatible = changes.length === 0;
    } else {
      compatible = false;
    }

    return { compatible, mode: mode as CompatibilityMode, changes, details: compatible ? 'Compatible' : `Found ${changes.length} breaking changes` };
  }

  checkCompatibility(name: string, fromVersion: number, toVersion: number): CompatibilityResult {
    const history = this.getVersionHistoryByName(name);
    const from = history.find(s => s.version === fromVersion);
    const to = history.find(s => s.version === toVersion);
    if (!from || !to) {
      return { compatible: false, mode: 'none', changes: [{ type: 'version_not_found', field: 'version', description: `Version ${fromVersion} or ${toVersion} not found`, severity: 'breaking' }], details: 'Version not found' };
    }

    const breaking = this.detectBreakingChanges(from, to);
    const mode = to.compatibility || 'backward';
    return { compatible: breaking.length === 0, mode: mode as CompatibilityMode, changes: breaking, details: breaking.length === 0 ? 'Compatible' : `${breaking.length} changes detected` };
  }

  diff(schemaId: string, fromVersion: number, toVersion: number): SchemaVersionDiff | null {
    const history = this.history.get(schemaId);
    if (!history) return null;

    const from = history.find(s => s.version === fromVersion);
    const to = history.find(s => s.version === toVersion);
    if (!from || !to) return null;

    const changes: string[] = [];
    if (from.content !== to.content) changes.push('Content updated');
    if (from.status !== to.status) changes.push(`Status: ${from.status} → ${to.status}`);
    if ((from.tags ?? []).join(',') !== (to.tags ?? []).join(',')) changes.push('Tags updated');

    const breakingChanges = this.detectBreakingChanges(from, to);

    return {
      schemaName: to.name,
      oldVersion: fromVersion,
      newVersion: toVersion,
      changes,
      breaking: breakingChanges.length > 0 || to.compatibility === 'none' || (from.compatibility === 'backward' && to.compatibility !== 'backward'),
    };
  }

  setStatus(id: string, status: SchemaStatus): SchemaEntry | null {
    const schema = this.schemas.get(id);
    if (!schema) return null;
    schema.status = status;
    schema.updatedAt = new Date().toISOString();
    return schema;
  }

  count(): number {
    return this.schemas.size;
  }

  search(query: string): SchemaEntry[] {
    const q = query.toLowerCase();
    return Array.from(this.schemas.values()).filter(s =>
      s.name.toLowerCase().includes(q) ||
      s.description?.toLowerCase().includes(q) ||
      (s.tags ?? []).some(t => t.toLowerCase().includes(q))
    );
  }

  registerFromZod<_T>(name: string, description: string, tags?: string[]): SchemaEntry {
    const content = JSON.stringify({ zodType: 'ZodObject', name, fields: description });
    return this.register(name, 'zod', content, description, tags);
  }

  persist(): void {
    const dirPath = join(process.cwd(), this.persistDir);
    if (!existsSync(dirPath)) {
      mkdirSync(dirPath, { recursive: true });
    }
    const filePath = join(dirPath, 'registry.json');
    this.save(filePath);
  }

  loadPersisted(): void {
    const filePath = join(process.cwd(), this.persistDir, 'registry.json');
    if (!existsSync(filePath)) return;
    const loaded = SchemaRegistry.load(filePath);
    this.schemas = loaded['schemas'];
    this.history = loaded['history'];
  }

  save(filePath: string): void {
    const dir = dirname(filePath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    const snapshot: SchemaRegistrySnapshot = {
      schemas: Array.from(this.schemas.entries()),
      history: Array.from(this.history.entries()),
    };
    writeFileSync(filePath, JSON.stringify(snapshot, null, 2), 'utf-8');
  }

  static load(filePath: string): SchemaRegistry {
    if (!existsSync(filePath)) return new SchemaRegistry();
    const raw = readFileSync(filePath, 'utf-8');
    const snapshot: SchemaRegistrySnapshot = JSON.parse(raw);
    const registry = new SchemaRegistry();
    registry.schemas = new Map(snapshot.schemas);
    registry.history = new Map(snapshot.history);
    return registry;
  }

  private addToHistory(schema: SchemaEntry): void {
    const history = this.history.get(schema.id) || [];
    history.push({ ...schema });
    this.history.set(schema.id, history);
  }
}

export function createSchemaRegistry(): SchemaRegistry {
  return new SchemaRegistry();
}
