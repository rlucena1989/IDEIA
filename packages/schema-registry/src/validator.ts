import { SchemaEntry, ValidationResult } from './types';
import { createLogger } from '@ideia/logger';
import { SchemaRegistry } from './registry';
const logger = createLogger('validator');

function checkType(value: unknown, type: string): boolean {
  switch (type) {
    case 'string': return typeof value === 'string';
    case 'number': return typeof value === 'number';
    case 'boolean': return typeof value === 'boolean';
    case 'array': return Array.isArray(value);
    case 'object': return typeof value === 'object' && !Array.isArray(value);
    default: return true;
  }
}

export class SchemaValidator {
  private registry: SchemaRegistry;

  constructor(registry: SchemaRegistry) {
    this.registry = registry;
  }

  validate(schemaId: string, data: unknown): ValidationResult {
    const schema = this.registry.get(schemaId);
    if (!schema) {
      return { valid: false, errors: [`Schema ${schemaId} not found`] };
    }
    return this.validateAgainstSchema(schema, data);
  }

  validateMany(validations: Array<{ schemaId: string; data: unknown }>): Map<string, ValidationResult> {
    const results = new Map<string, ValidationResult>();
    for (const v of validations) {
      results.set(v.schemaId, this.validate(v.schemaId, v.data));
    }
    return results;
  }

  private validateAgainstSchema(schema: SchemaEntry, data: unknown): ValidationResult {
    const errors: string[] = [];
    if (data === null || data === undefined) {
      errors.push('Data is null or undefined');
      return { valid: false, errors };
    }
    if (typeof data !== 'object') {
      errors.push(`Expected object, got ${typeof data}`);
      return { valid: false, errors };
    }
    return { valid: errors.length === 0, errors };
  }
}

export function createSchemaValidator(registry: SchemaRegistry): SchemaValidator {
  return new SchemaValidator(registry);
}
