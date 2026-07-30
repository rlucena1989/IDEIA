import { SchemaDefinition, SchemaVersion, SchemaField } from './types';
import { createLogger } from '@ideia/logger';
import * as crypto from 'crypto';
const logger = createLogger('schema-registry');

export class SchemaRegistry {
  private _schemas: Map<string, SchemaVersion[]> = new Map();

  async register(schema: SchemaDefinition): Promise<SchemaVersion> {
    const existing = this._schemas.get(schema.type) ?? [];
    if (existing.some(v => v.version === schema.version)) {
      throw new Error(`Schema ${schema.type} v${schema.version} already registered`);
    }
    const checksum = this._computeChecksum(schema);
    const version: SchemaVersion = {
      type: schema.type,
      version: schema.version,
      schema: { ...schema, createdAt: Date.now(), updatedAt: Date.now() },
      checksum,
      isDeprecated: false,
    };
    existing.push(version);
    existing.sort((a, b) => b.version - a.version);
    this._schemas.set(schema.type, existing);
    return version;
  }

  async validate(event: { type: string; data: Record<string, unknown>; version: number }): Promise<{ valid: boolean; errors: string[] }> {
    const versions = this._schemas.get(event.type);
    if (!versions) return { valid: true, errors: [] };
    const sv = versions.find(v => v.version === event.version);
    if (!sv) return { valid: false, errors: [`Schema ${event.type} v${event.version} not found`] };
    const errors: string[] = [];
    for (const field of sv.schema.fields) {
      const value = event.data[field.name];
      if (field.required && (value === undefined || value === null)) {
        errors.push(`Required field '${field.name}' is missing`);
      }
    }
    return { valid: errors.length === 0, errors };
  }

  resolve(type: string, version?: number): SchemaDefinition | null {
    const versions = this._schemas.get(type);
    if (!versions || versions.length === 0) return null;
    if (version !== undefined) return versions.find(v => v.version === version)?.schema ?? null;
    return versions[0].schema;
  }

  getLatestVersion(type: string): number {
    const versions = this._schemas.get(type);
    return versions && versions.length > 0 ? versions[0].version : 0;
  }

  listAllVersions(type: string): SchemaVersion[] {
    return this._schemas.get(type) ?? [];
  }

  deprecate(type: string, version: number): void {
    const versions = this._schemas.get(type);
    const sv = versions?.find(v => v.version === version);
    if (sv) {
      sv.isDeprecated = true;
      sv.schema.updatedAt = Date.now();
    }
  }

  private _computeChecksum(schema: SchemaDefinition): string {
    return crypto.createHash('sha256').update(JSON.stringify(schema.fields)).digest('hex').substring(0, 16);
  }
}
