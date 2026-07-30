export interface JSONSchema {
  $schema?: string;
  type: string;
  properties?: Record<string, JSONSchemaProperty>;
  required?: string[];
  additionalProperties?: boolean;
  definitions?: Record<string, JSONSchema>;
  items?: JSONSchema;
  $ref?: string;
  enum?: unknown[];
}

export interface JSONSchemaProperty {
  type?: string;
  description?: string;
  default?: unknown;
  properties?: Record<string, JSONSchemaProperty>;
  items?: JSONSchemaProperty;
  required?: string[];
  enum?: unknown[];
  $ref?: string;
  oneOf?: JSONSchemaProperty[];
  anyOf?: JSONSchemaProperty[];
}

export interface ValidationError {
  path: string;
  message: string;
  code: string;
}

type SchemaNode = JSONSchema | JSONSchemaProperty;

export class JSONSchemaProvider {
  private schemas = new Map<string, JSONSchema>();

  registerSchema(contractId: string, schema: JSONSchema): void {
    this.schemas.set(contractId, schema);
  }

  getSchema(contractId: string): JSONSchema | undefined {
    return this.schemas.get(contractId);
  }

  getAllSchemas(): Array<{ contractId: string; schema: JSONSchema }> {
    return Array.from(this.schemas.entries()).map(([contractId, schema]) => ({
      contractId,
      schema,
    }));
  }

  validate(data: unknown, schema: JSONSchema): ValidationError[] {
    const errors: ValidationError[] = [];
    this.validateInternal(data, schema, '$', errors);
    return errors;
  }

  private validateInternal(
    data: unknown,
    schema: SchemaNode,
    path: string,
    errors: ValidationError[],
  ): void {
    if (schema.$ref) {
      return;
    }

    if (schema.type === 'object' && typeof data === 'object' && data !== null && !Array.isArray(data)) {
      if (schema.required) {
        for (const requiredField of schema.required) {
          if (!(requiredField in (data as Record<string, unknown>))) {
            errors.push({
              path: `${path}.${requiredField}`,
              message: `Missing required field: "${requiredField}"`,
              code: 'REQUIRED',
            });
          }
        }
      }

      if (schema.properties) {
        for (const [key, propSchema] of Object.entries(schema.properties)) {
          if (key in (data as Record<string, unknown>)) {
            this.validateInternal(
              (data as Record<string, unknown>)[key],
              propSchema,
              `${path}.${key}`,
              errors,
            );
          }
        }
      }
    }

    if (schema.type === 'array' && Array.isArray(data)) {
      if (schema.items) {
        data.forEach((item, index) => {
          this.validateInternal(item, schema.items as SchemaNode, `${path}[${index}]`, errors);
        });
      }
    }

    if (schema.type === 'string' && typeof data !== 'string') {
      errors.push({ path, message: `Expected string, got ${typeof data}`, code: 'TYPE_MISMATCH' });
    }

    if (schema.type === 'number' && typeof data !== 'number') {
      errors.push({ path, message: `Expected number, got ${typeof data}`, code: 'TYPE_MISMATCH' });
    }

    if (schema.type === 'boolean' && typeof data !== 'boolean') {
      errors.push({ path, message: `Expected boolean, got ${typeof data}`, code: 'TYPE_MISMATCH' });
    }

    if (schema.enum && !schema.enum.includes(data)) {
      errors.push({
        path,
        message: `Value must be one of: ${schema.enum.join(', ')}`,
        code: 'ENUM_MISMATCH',
      });
    }
  }

  generateSchemaFromZod(zodObj: Record<string, unknown>): JSONSchema {
    const schema: JSONSchema = {
      $schema: 'http://json-schema.org/draft-07/schema#',
      type: 'object',
      properties: {},
      required: [],
    };

    for (const [key, value] of Object.entries(zodObj)) {
      const prop = this.inferProperty(value);
      (schema.properties as Record<string, JSONSchemaProperty>)[key] = prop;
    }

    return schema;
  }

  private inferProperty(value: unknown): JSONSchemaProperty {
    if (value === null) return { type: 'null' };

    if (Array.isArray(value)) {
      return {
        type: 'array',
        items: value.length > 0 ? this.inferProperty(value[0]) : { type: 'string' },
      };
    }

    switch (typeof value) {
      case 'string': return { type: 'string' };
      case 'number': return { type: 'number' };
      case 'boolean': return { type: 'boolean' };
      case 'object': {
        const props: Record<string, JSONSchemaProperty> = {};
        for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
          props[k] = this.inferProperty(v);
        }
        return {
          type: 'object',
          properties: props,
          required: Object.keys(value as Record<string, unknown>),
        };
      }
      default: return { type: 'string' };
    }
  }

  clear(): void {
    this.schemas.clear();
  }
}
