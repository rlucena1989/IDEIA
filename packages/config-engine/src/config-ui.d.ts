import { ConfigValue } from './types';
export interface ConfigField {
    key: string;
    value: ConfigValue;
    type: 'string' | 'number' | 'boolean' | 'object' | 'array';
    category: string;
    description?: string;
    readonly?: boolean;
    required?: boolean;
    enum?: ConfigValue[];
    min?: number;
    max?: number;
}
export interface ConfigCategory {
    name: string;
    description?: string;
    fields: ConfigField[];
}
export interface ConfigUIState {
    categories: ConfigCategory[];
    searchQuery: string;
    expandedCategories: Set<string>;
    modifiedFields: Set<string>;
}
export interface ConfigSuggestion {
    key: string;
    title: string;
    description: string;
    currentValue: ConfigValue;
    suggestedValue: ConfigValue;
    reason: string;
    impact: 'low' | 'medium' | 'high';
}
export interface DashboardCard {
    id: string;
    title: string;
    value: string | number;
    unit?: string;
    icon: string;
    trend?: 'up' | 'down' | 'stable';
    color: string;
}
export declare class ConfigUI {
    private state;
    constructor();
    loadFromConfig(config: Record<string, unknown>): void;
    private categorizeConfig;
    private determineCategory;
    private getCategoryDescription;
    private getFieldDescription;
    private determineType;
    setSearchQuery(query: string): void;
    getFilteredCategories(): ConfigCategory[];
    toggleCategory(categoryName: string): void;
    expandAll(): void;
    collapseAll(): void;
    updateField(key: string, value: ConfigValue): void;
    getModifiedFields(): ConfigField[];
    getCategories(): ConfigCategory[];
    getSuggestions(): ConfigSuggestion[];
    getDashboardCards(): DashboardCard[];
    searchConfig(query: string): ConfigField[];
    getModifiedKeys(): string[];
    resetField(key: string): void;
    resetAll(): void;
    exportToConfig(): Record<string, unknown>;
    getState(): ConfigUIState;
    getCompleteConfig(): Record<string, ConfigValue>;
    getConfigByCategory(category: string): ConfigField[];
    renderField(fieldId: string): string;
    renderCategory(categoryName: string): string;
    validateVisible(): Array<{
        key: string;
        error: string;
    }>;
    toJsonSchema(): Record<string, unknown>;
    getEditorConfig(): Record<string, unknown>;
    private renderFieldHtml;
}
export declare function createConfigUI(): ConfigUI;
//# sourceMappingURL=config-ui.d.ts.map