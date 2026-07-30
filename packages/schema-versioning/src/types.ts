export interface EventSchema { name: string; version: number; fields: SchemaField[]; compatibility: 'backward' | 'forward' | 'full' | 'none' }
export interface SchemaField { name: string; type: string; required: boolean; default?: unknown }
export interface SchemaMigration { fromVersion: number; toVersion: number; transforms: FieldTransform[] }
export interface FieldTransform { field: string; action: 'add' | 'remove' | 'rename' | 'typechange'; oldName?: string; newType?: string }
export interface SchemaRegistry { schemas: Map<string, EventSchema>; register(schema: EventSchema): void; validate(event: Record<string, unknown>, schemaName: string): boolean }
