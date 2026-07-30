import { Emitter, Disposable } from '@ideia/core-contributions';
import { createLogger } from '@ideia/logger';
import { PreferenceProperty, PreferenceSchema, PreferenceSchemaRegistry } from './types';

export class DefaultPreferenceSchemaRegistry implements PreferenceSchemaRegistry {
  private schemas = new Map<string, PreferenceSchema>();
  private propertyMap = new Map<string, PreferenceProperty>();

  register(schema: PreferenceSchema): Disposable {
    this.schemas.set(schema.id, schema);
    for (const prop of schema.properties) {
      this.propertyMap.set(prop.key, prop);
    }
    return { dispose: () => this.unregister(schema.id) };
  }

  getSchema(id: string): PreferenceSchema | undefined {
    return this.schemas.get(id);
  }

  getProperty(key: string): PreferenceProperty | undefined {
    return this.propertyMap.get(key);
  }

  getAllProperties(): PreferenceProperty[] {
    return Array.from(this.propertyMap.values());
  }

  validate(key: string, value: unknown): boolean {
    const prop = this.propertyMap.get(key);
    if (!prop) return true;

    if (prop.enum && !prop.enum.includes(value as string)) return false;
    if (prop.type === 'number') {
      const num = value as number;
      if (prop.minimum !== undefined && num < prop.minimum) return false;
      if (prop.maximum !== undefined && num > prop.maximum) return false;
    }
    if (typeof value !== prop.type) return false;

    return true;
  }

  private unregister(id: string): void {
    const schema = this.schemas.get(id);
    if (schema) {
      for (const prop of schema.properties) {
        this.propertyMap.delete(prop.key);
      }
      this.schemas.delete(id);
    }
  }
}
