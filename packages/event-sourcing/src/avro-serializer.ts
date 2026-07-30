import { DomainEvent, AvroSchemaMigration } from './types';
import { createLogger } from '@ideia/logger';
const logger = createLogger('avro-serializer');

export class AvroEventSerializer {
  private _schemas = new Map<string, Record<string, unknown>>();

  registerSchema(name: string, schema: Record<string, unknown>): void {
    this._schemas.set(name, schema);
  }

  serialize(event: DomainEvent): Uint8Array {
    const payload = { ...event.data, __eventType: event.type, __version: event.version };
    return new TextEncoder().encode(JSON.stringify(payload));
  }

  deserialize(data: Uint8Array, schemaName: string): DomainEvent {
    const parsed = JSON.parse(new TextDecoder().decode(data)) as Record<string, unknown>;
    return {
      id: (parsed.__eventId as string) || crypto.randomUUID(),
      aggregateId: (parsed.aggregateId as string) || '',
      type: (parsed.__eventType as string) || schemaName,
      version: (parsed.__version as number) || 1,
      data: parsed,
      timestamp: (parsed.timestamp as number) || Date.now(),
    };
  }

  evolveSchema(oldSchema: Record<string, unknown>, newSchema: Record<string, unknown>): AvroSchemaMigration {
    const oldFields = (oldSchema.fields as Array<{ name: string }>) || [];
    const newFields = (newSchema.fields as Array<{ name: string }>) || [];
    const added = newFields.filter(nf => !oldFields.some(of => of.name === nf.name));
    const removed = oldFields.filter(of => !newFields.some(nf => nf.name === of.name));
    return {
      compatibility: removed.length === 0 ? 'BACKWARD' : 'NONE',
      added: added.map(a => a.name),
      removed: removed.map(r => r.name),
      migrationScript: `Map old fields ${oldFields.map(f => f.name).join(',')} to new`,
    };
  }
}
