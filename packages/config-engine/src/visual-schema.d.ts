export type FieldType = 'string' | 'number' | 'boolean' | 'select' | 'slider' | 'color' | 'textarea' | 'array';
export interface VisualField {
    key: string;
    label: string;
    type: FieldType;
    description?: string;
    defaultValue?: unknown;
    options?: Array<{
        label: string;
        value: string;
    }>;
    min?: number;
    max?: number;
    step?: number;
    required?: boolean;
    placeholder?: string;
    category: string;
    order?: number;
}
export interface WidgetType {
    type: 'input' | 'select' | 'toggle' | 'slider' | 'color-picker' | 'textarea' | 'array-editor';
    helperText?: string;
    validationMessage?: string;
    group?: string;
}
export declare class VisualSchema {
    private fields;
    private categories;
    private fieldDependencies;
    constructor();
    addField(field: VisualField): void;
    addFields(fields: VisualField[]): void;
    addDependency(fieldId: string, dependsOn: string): void;
    getField(key: string): VisualField | undefined;
    getFieldSchema(fieldId: string): Record<string, unknown>;
    getFieldCategory(fieldId: string): string | undefined;
    getFieldDependencies(fieldId: string): string[];
    getAllFields(): VisualField[];
    getFieldsByCategory(category: string): VisualField[];
    getCategories(): Array<{
        id: string;
        label: string;
        order: number;
    }>;
    getFieldWidget(field: VisualField): WidgetType;
    getFieldGroups(): Array<{
        id: string;
        label: string;
        order: number;
        fields: VisualField[];
    }>;
    generateUISchema(): Record<string, unknown>;
}
export declare function createVisualSchema(): VisualSchema;
//# sourceMappingURL=visual-schema.d.ts.map