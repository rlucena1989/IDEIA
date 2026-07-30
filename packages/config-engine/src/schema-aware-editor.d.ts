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
    errors: Array<{
        path: string;
        message: string;
    }>;
    warnings: Array<{
        path: string;
        message: string;
    }>;
    formatted: string;
}
export declare class SchemaAwareEditor {
    private schema;
    constructor(schema?: SchemaCategory[]);
    getSchema(): SchemaCategory[];
    getCategory(name: string): SchemaCategory | undefined;
    getField(category: string, key: string): SchemaField | undefined;
    getSchemaTree(): SchemaCategory[];
    getFieldSchema(fieldPath: string): SchemaField | undefined;
    getValidationErrors(): Array<{
        path: string;
        message: string;
    }>;
    getJsonSchema(): Record<string, unknown>;
    validateJson(json: Record<string, unknown>): {
        valid: boolean;
        errors: string[];
    };
    suggestCompletions(path: string): Array<{
        label: string;
        type: string;
        description: string;
    }>;
    formatJson(json: string): string;
    getSchemaDocumentation(path: string): string | undefined;
    validateConfig(config: Record<string, unknown>): SchemaAwareResult;
    suggestDefaults(): Record<string, Record<string, unknown>>;
    coerceTypes(config: Record<string, unknown>): Record<string, unknown>;
}
export declare function createSchemaAwareEditor(): SchemaAwareEditor;
//# sourceMappingURL=schema-aware-editor.d.ts.map