import { ProtobufField, ProtobufType, ProtoCompatibility } from './types';
import { createLogger } from '@ideia/logger';
const logger = createLogger('protobuf-evolution');

export class ProtobufSchemaEvolution {
  private _typeRegistry = new Map<string, ProtobufType>();

  registerType(name: string, fields: ProtobufField[]): void {
    this._typeRegistry.set(name, { name, fields, version: 1 });
  }

  evolveWithAny(original: Record<string, unknown>, newField: string, value: unknown): Record<string, unknown> {
    return {
      ...original,
      [`@any:${newField}`]: { type: typeof value, value },
    };
  }

  wrapNullable(field: string, value: unknown): Record<string, unknown> {
    return { [field]: { kind: value === null ? 'null' : 'value', value } };
  }

  evolveTimestamp(field: string, oldValue: string | number): Record<string, unknown> {
    if (typeof oldValue === 'number') {
      return { [field]: { seconds: Math.floor(oldValue / 1000), nanos: (oldValue % 1000) * 1e6 } };
    }
    return { [field]: { seconds: Math.floor(new Date(oldValue).getTime() / 1000), nanos: 0 } };
  }

  checkFieldCompatibility(oldFields: ProtobufField[], newFields: ProtobufField[]): ProtoCompatibility {
    const added = newFields.filter(nf => !oldFields.some(of => of.name === nf.name));
    const removed = oldFields.filter(of => !newFields.some(nf => nf.name === of.name));
    const changedType = newFields.filter(nf => {
      const of = oldFields.find(f => f.name === nf.name);
      return of && of.type !== nf.type;
    });
    return {
      compatible: removed.length === 0 && changedType.length === 0,
      added: added.map(a => a.name),
      removed: removed.map(r => r.name),
      typeChanged: changedType.map(c => c.name),
      wireCompatible: removed.length === 0,
    };
  }

  getType(name: string): ProtobufType | undefined {
    return this._typeRegistry.get(name);
  }

  listTypes(): string[] {
    return Array.from(this._typeRegistry.keys());
  }
}
