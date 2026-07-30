import { ConfigValue } from './types';
import { createLogger } from '@ideia/logger';
const logger = createLogger('config-ui');

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

export class ConfigUI {
  private state: ConfigUIState;

  constructor() {
    this.state = {
      categories: [],
      searchQuery: '',
      expandedCategories: new Set(),
      modifiedFields: new Set(),
    };
  }

  loadFromConfig(config: Record<string, unknown>): void {
    this.state.categories = this.categorizeConfig(config as Record<string, ConfigValue>);
    this.state.expandedCategories = new Set(this.state.categories.map(c => c.name));
  }

  private categorizeConfig(config: Record<string, ConfigValue>): ConfigCategory[] {
    const categories: Map<string, ConfigField[]> = new Map();

    for (const [key, value] of Object.entries(config)) {
      const category = this.determineCategory(key);
      const field: ConfigField = {
        key,
        value: value as ConfigValue,
        type: this.determineType(value as ConfigValue),
        category,
        description: this.getFieldDescription(key),
      };

      if (!categories.has(category)) {
        categories.set(category, []);
      }
      const catFields = categories.get(category);
      if (catFields) catFields.push(field);
    }

    return Array.from(categories.entries()).map(([name, fields]) => ({
      name,
      description: this.getCategoryDescription(name),
      fields: fields.sort((a, b) => a.key.localeCompare(b.key)),
    }));
  }

  private determineCategory(key: string): string {
    if (key.startsWith('security.')) return 'Security';
    if (key.startsWith('logging.')) return 'Logging';
    if (key.startsWith('agent.')) return 'Agent';
    if (key.startsWith('ui.')) return 'UI';
    if (key.startsWith('editor.')) return 'Editor';
    if (key.startsWith('terminal.')) return 'Terminal';
    if (key.startsWith('git.')) return 'Git';
    if (key.startsWith('llm.')) return 'LLM';
    return 'General';
  }

  private getCategoryDescription(category: string): string {
    const descriptions: Record<string, string> = {
      'Security': 'Security and access control settings',
      'Logging': 'Logging and debugging configuration',
      'Agent': 'AI agent behavior and capabilities',
      'UI': 'User interface preferences',
      'Editor': 'Editor-specific settings',
      'Terminal': 'Terminal configuration',
      'Git': 'Git integration settings',
      'LLM': 'Language model provider settings',
      'General': 'General application settings',
    };
    return descriptions[category] || '';
  }

  private getFieldDescription(key: string): string {
    const descriptions: Record<string, string> = {
      'security.sandbox.enabled': 'Enable sandbox for code execution',
      'security.audit.enabled': 'Enable audit trail logging',
      'security.logLevel': 'Logging verbosity level',
      'agent.maxTokens': 'Maximum tokens per response',
      'agent.temperature': 'Response randomness (0-1)',
      'ui.theme': 'Application theme',
      'editor.fontSize': 'Editor font size',
      'terminal.shell': 'Default shell executable',
      'git.autoCommit': 'Automatically commit changes',
      'llm.provider': 'LLM provider to use',
      'llm.model': 'Model name for the provider',
    };
    return descriptions[key] || '';
  }

  private determineType(value: ConfigValue): ConfigField['type'] {
    if (Array.isArray(value)) return 'array';
    if (value === null) return 'object';
    return typeof value as ConfigField['type'];
  }

  setSearchQuery(query: string): void {
    this.state.searchQuery = query.toLowerCase();
  }

  getFilteredCategories(): ConfigCategory[] {
    let categories = this.state.categories;

    if (this.state.searchQuery) {
      categories = categories.map(cat => ({
        ...cat,
        fields: cat.fields.filter(field =>
          field.key.toLowerCase().includes(this.state.searchQuery) ||
          (field.description && field.description.toLowerCase().includes(this.state.searchQuery))
        ),
      })).filter(cat => cat.fields.length > 0);
    }

    return categories;
  }

  toggleCategory(categoryName: string): void {
    if (this.state.expandedCategories.has(categoryName)) {
      this.state.expandedCategories.delete(categoryName);
    } else {
      this.state.expandedCategories.add(categoryName);
    }
  }

  expandAll(): void {
    this.state.expandedCategories = new Set(this.state.categories.map(c => c.name));
  }

  collapseAll(): void {
    this.state.expandedCategories.clear();
  }

  updateField(key: string, value: ConfigValue): void {
    for (const category of this.state.categories) {
      const field = category.fields.find(f => f.key === key);
      if (field) {
        field.value = value;
        field.type = this.determineType(value);
        this.state.modifiedFields.add(key);
        break;
      }
    }
  }

  getModifiedFields(): ConfigField[] {
    const modified: ConfigField[] = [];
    for (const category of this.state.categories) {
      for (const field of category.fields) {
        if (this.state.modifiedFields.has(field.key)) {
          modified.push(field);
        }
      }
    }
    return modified;
  }

  getCategories(): ConfigCategory[] {
    return this.state.categories.map(c => ({
      ...c,
      fields: [...c.fields],
    }));
  }

  getSuggestions(): ConfigSuggestion[] {
    const suggestions: ConfigSuggestion[] = [];
    for (const category of this.state.categories) {
      for (const field of category.fields) {
        if (field.value === null || field.value === undefined) {
          suggestions.push({
            key: field.key,
            title: `Configure ${field.key}`,
            description: field.description ?? `Set value for ${field.key}`,
            currentValue: field.value,
            suggestedValue: field.enum?.[0] ?? '',
            reason: 'Field is not configured',
            impact: field.required ? 'high' : 'medium',
          });
        }
      }
    }
    return suggestions;
  }

  getDashboardCards(): DashboardCard[] {
    const totalFields = this.state.categories.reduce((s, c) => s + c.fields.length, 0);
    const modifiedCount = this.state.modifiedFields.size;
    const configuredFields = this.state.categories.reduce((s, c) => s + c.fields.filter(f => f.value !== null && f.value !== undefined).length, 0);
    return [
      { id: 'total', title: 'Total Config Fields', value: totalFields, icon: 'settings', color: '#58a6ff' },
      { id: 'configured', title: 'Configured', value: configuredFields, icon: 'check', color: '#3fb950', trend: configuredFields > 0 ? 'up' : 'stable' },
      { id: 'unconfigured', title: 'Unconfigured', value: totalFields - configuredFields, icon: 'warning', color: '#d29922', trend: configuredFields === totalFields ? 'down' : 'stable' },
      { id: 'modified', title: 'Modified (unsaved)', value: modifiedCount, icon: 'edit', color: '#db6d28', trend: modifiedCount > 0 ? 'up' : 'stable' },
    ];
  }

  searchConfig(query: string): ConfigField[] {
    const q = query.toLowerCase();
    const results: ConfigField[] = [];
    for (const category of this.state.categories) {
      for (const field of category.fields) {
        if (field.key.toLowerCase().includes(q) || String(field.value).toLowerCase().includes(q) || (field.description ?? '').toLowerCase().includes(q)) {
          results.push(field);
        }
      }
    }
    return results;
  }

  getModifiedKeys(): string[] {
    return Array.from(this.state.modifiedFields);
  }

  resetField(key: string): void {
    this.state.modifiedFields.delete(key);
  }

  resetAll(): void {
    this.state.modifiedFields.clear();
  }

  exportToConfig(): Record<string, unknown> {
    const config: Record<string, unknown> = {};
    for (const category of this.state.categories) {
      for (const field of category.fields) {
        config[field.key] = field.value;
      }
    }
    return config;
  }

  getState(): ConfigUIState {
    return {
      categories: this.state.categories,
      searchQuery: this.state.searchQuery,
      expandedCategories: new Set(this.state.expandedCategories),
      modifiedFields: new Set(this.state.modifiedFields),
    };
  }

  getCompleteConfig(): Record<string, ConfigValue> {
    const result: Record<string, ConfigValue> = {};
    for (const category of this.state.categories) {
      for (const field of category.fields) {
        result[field.key] = field.value;
      }
    }
    return result;
  }

  getConfigByCategory(category: string): ConfigField[] {
    const cat = this.state.categories.find(c => c.name === category);
    return cat ? [...cat.fields] : [];
  }

  renderField(fieldId: string): string {
    for (const category of this.state.categories) {
      const field = category.fields.find(f => f.key === fieldId);
      if (field) {
        return this.renderFieldHtml(field);
      }
    }
    return '';
  }

  renderCategory(categoryName: string): string {
    const cat = this.state.categories.find(c => c.name === categoryName);
    if (!cat) return '';
    const parts: string[] = [];
    parts.push(`<div class="config-category" data-category="${cat.name}">`);
    parts.push(`  <h3>${cat.description ?? cat.name}</h3>`);
    for (const field of cat.fields) {
      parts.push(this.renderFieldHtml(field));
    }
    parts.push(`</div>`);
    return parts.join('\n');
  }

  validateVisible(): Array<{ key: string; error: string }> {
    const errors: Array<{ key: string; error: string }> = [];
    for (const category of this.state.categories) {
      for (const field of category.fields) {
        if (field.required && (field.value === null || field.value === undefined)) {
          errors.push({ key: field.key, error: `Required field "${field.key}" is not set` });
        }
      }
    }
    return errors;
  }

  toJsonSchema(): Record<string, unknown> {
    const schema: Record<string, unknown> = {
      $schema: 'http://json-schema.org/draft-07/schema#',
      type: 'object',
      properties: {},
      required: [],
    };
    const props: Record<string, unknown> = {};
    const required: string[] = [];
    for (const category of this.state.categories) {
      for (const field of category.fields) {
        const fieldSchema: Record<string, unknown> = {
          type: field.type === 'array' ? 'array' : field.type,
          description: field.description ?? '',
        };
        if (field.enum) fieldSchema.enum = field.enum;
        if (field.min !== undefined) fieldSchema.minimum = field.min;
        if (field.max !== undefined) fieldSchema.maximum = field.max;
        props[field.key] = fieldSchema;
        if (field.required) required.push(field.key);
      }
    }
    schema.properties = props;
    schema.required = required;
    return schema;
  }

  getEditorConfig(): Record<string, unknown> {
    return {
      minimap: { enabled: false },
      lineNumbers: 'off',
      folding: false,
      wordWrap: 'on',
      renderWhitespace: 'none',
      fontSize: 13,
    };
  }

  private renderFieldHtml(field: ConfigField): string {
    const value = field.value !== undefined && field.value !== null ? String(field.value) : '';
    const readonly = field.readonly ? ' readonly' : '';
    const desc = field.description ? `<small style="color:#888;display:block;margin-top:2px;">${field.description}</small>` : '';
    let input = '';

    if (field.type === 'boolean') {
      const checked = field.value ? ' checked' : '';
      input = `<label><input type="checkbox"${checked}${readonly} data-key="${field.key}" class="config-toggle"> ${field.description ?? ''}</label>`;
    } else if (field.enum) {
      const options = field.enum.map(v => `<option value="${String(v)}"${value === String(v) ? ' selected' : ''}>${String(v)}</option>`).join('');
      input = `<select data-key="${field.key}"${readonly} class="config-select">${options}</select>${desc}`;
    } else if (field.type === 'number') {
      input = `<input type="number" value="${value}"${readonly} data-key="${field.key}" class="config-input"${field.min !== undefined ? ` min="${field.min}"` : ''}${field.max !== undefined ? ` max="${field.max}"` : ''}>${desc}`;
    } else {
      input = `<input type="text" value="${value}"${readonly} data-key="${field.key}" class="config-input" placeholder="${field.description ?? ''}">${desc}`;
    }

    return `<div class="config-field" style="margin-bottom:12px;">
  <label style="display:block;font-size:13px;font-weight:500;margin-bottom:4px;color:#d4d4d4;">${field.key}</label>
  ${input}
</div>`;
  }
}

export function createConfigUI(): ConfigUI {
  return new ConfigUI();
}
