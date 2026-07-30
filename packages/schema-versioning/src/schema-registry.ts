import { createLogger } from '@ideia/logger'
import { EventSchema, SchemaMigration, FieldTransform, SchemaField } from './types'

const logger = createLogger('schema-registry')

export class SchemaRegistry {
  private schemas = new Map<string, EventSchema[]>()
  private migrations: SchemaMigration[] = []

  register(schema: EventSchema): void {
    if (!this.schemas.has(schema.name)) this.schemas.set(schema.name, [])
    this.schemas.get(schema.name)!.push(schema)
    logger.info(`Schema registered`, { name: schema.name, version: schema.version })
  }

  getSchema(name: string, version?: number): EventSchema | undefined {
    const versions = this.schemas.get(name)
    if (!versions) return undefined
    if (version) return versions.find(s => s.version === version)
    return versions[versions.length - 1]
  }

  getAllVersions(name: string): number[] {
    return (this.schemas.get(name) ?? []).map(s => s.version).sort()
  }

  addMigration(migration: SchemaMigration): void { this.migrations.push(migration) }

  validate(event: Record<string, unknown>, schemaName: string, version?: number): boolean {
    const schema = this.getSchema(schemaName, version)
    if (!schema) return false
    for (const field of schema.fields) {
      if (field.required && event[field.name] === undefined) {
        logger.warn(`Validation failed: missing required field ${field.name}`)
        return false
      }
    }
    return true
  }

  migrate(event: Record<string, unknown>, fromSchema: string, toVersion: number): Record<string, unknown> {
    const result = { ...event }
    const relevantMigrations = this.migrations.filter(m => m.toVersion <= toVersion)

    for (const migration of relevantMigrations) {
      for (const transform of migration.transforms) {
        switch (transform.action) {
          case 'rename':
            if (transform.oldName && result[transform.oldName] !== undefined) {
              result[transform.field] = result[transform.oldName]
              delete result[transform.oldName]
            }
            break
          case 'remove':
            delete result[transform.field]
            break
          case 'add':
            if (result[transform.field] === undefined) result[transform.field] = null
            break
        }
      }
    }
    return result
  }
}
