export interface SchemaField {
  key: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array' | 'enum';
  label: string;
  description: string;
  defaultValue?: unknown;
  required: boolean;
  enumValues?: string[];
  children?: SchemaField[];
  validation?: (value: unknown) => string | null;
}

export interface SchemaCategory {
  name: string;
  label: string;
  fields: SchemaField[];
  order: number;
}

export interface SchemaAwareResult {
  valid: boolean;
  errors: Array<{ path: string; message: string }>;
  warnings: Array<{ path: string; message: string }>;
  formatted: string;
}

const CONFIG_SCHEMA: SchemaCategory[] = [
  {
    name: 'autonomy', label: 'Autonomy', order: 1,
    fields: [
      { key: 'level', type: 'enum', label: 'Level', description: 'Autonomy level (N0-N4)', defaultValue: 'N1', required: true, enumValues: ['N0', 'N1', 'N2', 'N3', 'N4'] },
      { key: 'maxActionsPerMinute', type: 'number', label: 'Max Actions/Min', description: 'Maximum autonomous actions per minute', defaultValue: 10, required: false },
      { key: 'requireApproval', type: 'boolean', label: 'Require Approval', description: 'Require human approval for actions', defaultValue: true, required: false },
    ],
  },
  {
    name: 'scanners', label: 'Scanners', order: 2,
    fields: [
      { key: 'enabled', type: 'boolean', label: 'Enabled', description: 'Enable scanners', defaultValue: true, required: false },
      { key: 'interval', type: 'number', label: 'Interval (min)', description: 'Scan interval in minutes', defaultValue: 60, required: false },
      { key: 'types', type: 'array', label: 'Types', description: 'Scanner types to run', defaultValue: ['dependencies', 'secrets', 'quality'], required: false },
    ],
  },
  {
    name: 'safety', label: 'Safety', order: 3,
    fields: [
      { key: 'sandbox', type: 'boolean', label: 'Sandbox', description: 'Enable sandbox execution', defaultValue: true, required: true },
      { key: 'auditEnabled', type: 'boolean', label: 'Audit', description: 'Enable audit trail', defaultValue: true, required: true },
      { key: 'outputValidation', type: 'boolean', label: 'Output Validation', description: 'Validate all outputs', defaultValue: true, required: false },
    ],
  },
  {
    name: 'ui', label: 'UI', order: 4,
    fields: [
      { key: 'theme', type: 'enum', label: 'Theme', description: 'UI theme', defaultValue: 'dark', required: false, enumValues: ['dark', 'light', 'high-contrast'] },
      { key: 'notifications', type: 'boolean', label: 'Notifications', description: 'Enable notifications', defaultValue: true, required: false },
    ],
  },
  {
    name: 'telemetry', label: 'Telemetry', order: 5,
    fields: [
      { key: 'enabled', type: 'boolean', label: 'Enabled', description: 'Enable telemetry', defaultValue: false, required: false },
      { key: 'level', type: 'enum', label: 'Level', description: 'Telemetry detail level', defaultValue: 'basic', required: false, enumValues: ['minimal', 'basic', 'detailed'] },
    ],
  },
];

export class SchemaAwareEditor {
  private schema: SchemaCategory[];

  constructor(schema?: SchemaCategory[]) {
    this.schema = schema ?? CONFIG_SCHEMA;
  }

  getSchema(): SchemaCategory[] {
    return this.schema.map(c => ({
      ...c,
      fields: c.fields.map(f => ({ ...f })),
    }));
  }

  getCategory(name: string): SchemaCategory | undefined {
    return this.schema.find(c => c.name === name);
  }

  getField(category: string, key: string): SchemaField | undefined {
    return this.schema.find(c => c.name === category)?.fields.find(f => f.key === key);
  }

  getSchemaTree(): SchemaCategory[] {
    return this.schema.map(c => ({
      ...c,
      fields: c.fields.map(f => ({ ...f })),
    }));
  }

  getFieldSchema(fieldPath: string): SchemaField | undefined {
    for (const cat of this.schema) {
      const field = cat.fields.find(f => f.key === fieldPath || `${cat.name}.${f.key}` === fieldPath);
      if (field) return { ...field };
    }
    return undefined;
  }

  getValidationErrors(): Array<{ path: string; message: string }> {
    const errors: Array<{ path: string; message: string }> = [];
    for (const category of this.schema) {
      for (const field of category.fields) {
        const path = `${category.name}.${field.key}`;
        if (field.required && !field.defaultValue) {
          errors.push({ path, message: `Required field "${field.label}" needs a value` });
        }
      }
    }
    return errors;
  }

  getJsonSchema(): Record<string, unknown> {
    const properties: Record<string, unknown> = {};
    const required: string[] = [];
    for (const category of this.schema) {
      for (const field of category.fields) {
        const prop: Record<string, unknown> = {
          type: field.type === 'enum' ? 'string' : field.type,
          description: field.description,
        };
        if (field.enumValues) prop.enum = field.enumValues;
        if (field.defaultValue !== undefined) prop.default = field.defaultValue;
        const path = `${category.name}.${field.key}`;
        properties[path] = prop;
        if (field.required) required.push(path);
      }
    }
    return {
      $schema: 'http://json-schema.org/draft-07/schema#',
      type: 'object',
      properties,
      required,
    };
  }

  validateJson(json: Record<string, unknown>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    for (const category of this.schema) {
      for (const field of category.fields) {
        const path = `${category.name}.${field.key}`;
        const value = json[path] as unknown;
        if (field.required && (value === undefined || value === null)) {
          errors.push(`Missing required field: ${path}`);
        }
        if (value !== undefined && value !== null) {
          if (field.type === 'number' && typeof value !== 'number') {
            errors.push(`Field "${path}" must be a number`);
          }
          if (field.type === 'boolean' && typeof value !== 'boolean') {
            errors.push(`Field "${path}" must be a boolean`);
          }
        }
      }
    }
    return { valid: errors.length === 0, errors };
  }

  suggestCompletions(path: string): Array<{ label: string; type: string; description: string }> {
    const parts = path.split('.');
    const suggestions: Array<{ label: string; type: string; description: string }> = [];
    for (const category of this.schema) {
      for (const field of category.fields) {
        const fieldPath = `${category.name}.${field.key}`;
        if (fieldPath.startsWith(path) && fieldPath !== path) {
          suggestions.push({
            label: fieldPath.slice(path.length + 1),
            type: field.type,
            description: field.description,
          });
        }
      }
    }
    return suggestions;
  }

  formatJson(json: string): string {
    try {
      const parsed = JSON.parse(json);
      return JSON.stringify(parsed, null, 2);
    } catch {
      return json;
    }
  }

  getSchemaDocumentation(path: string): string | undefined {
    for (const category of this.schema) {
      const field = category.fields.find(f => `${category.name}.${f.key}` === path);
      if (field) return field.description;
    }
    return undefined;
  }

  validateConfig(config: Record<string, unknown>): SchemaAwareResult {
    const errors: Array<{ path: string; message: string }> = [];
    const warnings: Array<{ path: string; message: string }> = [];

    for (const category of this.schema) {
      const categoryConfig = config[category.name] as Record<string, unknown> | undefined;

      for (const field of category.fields) {
        const path = `${category.name}.${field.key}`;
        const value = categoryConfig?.[field.key] ?? field.defaultValue;

        if (field.required && (value === undefined || value === null)) {
          errors.push({ path, message: `Required field "${field.label}" is missing` });
          continue;
        }

        if (value === undefined || value === null) continue;

        if (field.type === 'enum' && field.enumValues && !field.enumValues.includes(String(value))) {
          errors.push({ path, message: `Invalid value "${String(value)}" for ${field.label}. Allowed: ${field.enumValues.join(', ')}` });
        }

        if (field.type === 'number' && typeof value !== 'number') {
          errors.push({ path, message: `Field "${field.label}" must be a number` });
        }

        if (field.type === 'boolean' && typeof value !== 'boolean') {
          errors.push({ path, message: `Field "${field.label}" must be a boolean` });
        }

        if (field.validation) {
          const validationError = field.validation(value);
          if (validationError) {
            errors.push({ path, message: validationError });
          }
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      formatted: JSON.stringify(config, null, 2),
    };
  }

  suggestDefaults(): Record<string, Record<string, unknown>> {
    const config: Record<string, Record<string, unknown>> = {};
    for (const category of this.schema) {
      const catConfig: Record<string, unknown> = {};
      for (const field of category.fields) {
        if (field.defaultValue !== undefined) {
          catConfig[field.key] = field.defaultValue;
        }
      }
      config[category.name] = catConfig;
    }
    return config;
  }

  coerceTypes(config: Record<string, unknown>): Record<string, unknown> {
    const result: Record<string, unknown> = JSON.parse(JSON.stringify(config));
    for (const category of this.schema) {
      const catConfig = result[category.name] as Record<string, unknown> | undefined;
      if (!catConfig) continue;
      for (const field of category.fields) {
        const value = catConfig[field.key];
        if (value === undefined || value === null) continue;
        if (field.type === 'number') {
          catConfig[field.key] = Number(value);
        } else if (field.type === 'boolean') {
          catConfig[field.key] = value === true || value === 'true' || value === 1;
        }
      }
    }
    return result;
  }
}

export function createSchemaAwareEditor(): SchemaAwareEditor {
  return new SchemaAwareEditor();
}
