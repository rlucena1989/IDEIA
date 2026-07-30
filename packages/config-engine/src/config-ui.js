"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConfigUI = void 0;
exports.createConfigUI = createConfigUI;
const logger_1 = require("@ideia/logger");
const logger = (0, logger_1.createLogger)('config-ui');
class ConfigUI {
    state;
    constructor() {
        this.state = {
            categories: [],
            searchQuery: '',
            expandedCategories: new Set(),
            modifiedFields: new Set(),
        };
    }
    loadFromConfig(config) {
        this.state.categories = this.categorizeConfig(config);
        this.state.expandedCategories = new Set(this.state.categories.map(c => c.name));
    }
    categorizeConfig(config) {
        const categories = new Map();
        for (const [key, value] of Object.entries(config)) {
            const category = this.determineCategory(key);
            const field = {
                key,
                value: value,
                type: this.determineType(value),
                category,
                description: this.getFieldDescription(key),
            };
            if (!categories.has(category)) {
                categories.set(category, []);
            }
            const catFields = categories.get(category);
            if (catFields)
                catFields.push(field);
        }
        return Array.from(categories.entries()).map(([name, fields]) => ({
            name,
            description: this.getCategoryDescription(name),
            fields: fields.sort((a, b) => a.key.localeCompare(b.key)),
        }));
    }
    determineCategory(key) {
        if (key.startsWith('security.'))
            return 'Security';
        if (key.startsWith('logging.'))
            return 'Logging';
        if (key.startsWith('agent.'))
            return 'Agent';
        if (key.startsWith('ui.'))
            return 'UI';
        if (key.startsWith('editor.'))
            return 'Editor';
        if (key.startsWith('terminal.'))
            return 'Terminal';
        if (key.startsWith('git.'))
            return 'Git';
        if (key.startsWith('llm.'))
            return 'LLM';
        return 'General';
    }
    getCategoryDescription(category) {
        const descriptions = {
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
    getFieldDescription(key) {
        const descriptions = {
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
    determineType(value) {
        if (Array.isArray(value))
            return 'array';
        if (value === null)
            return 'object';
        return typeof value;
    }
    setSearchQuery(query) {
        this.state.searchQuery = query.toLowerCase();
    }
    getFilteredCategories() {
        let categories = this.state.categories;
        if (this.state.searchQuery) {
            categories = categories.map(cat => ({
                ...cat,
                fields: cat.fields.filter(field => field.key.toLowerCase().includes(this.state.searchQuery) ||
                    (field.description && field.description.toLowerCase().includes(this.state.searchQuery))),
            })).filter(cat => cat.fields.length > 0);
        }
        return categories;
    }
    toggleCategory(categoryName) {
        if (this.state.expandedCategories.has(categoryName)) {
            this.state.expandedCategories.delete(categoryName);
        }
        else {
            this.state.expandedCategories.add(categoryName);
        }
    }
    expandAll() {
        this.state.expandedCategories = new Set(this.state.categories.map(c => c.name));
    }
    collapseAll() {
        this.state.expandedCategories.clear();
    }
    updateField(key, value) {
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
    getModifiedFields() {
        const modified = [];
        for (const category of this.state.categories) {
            for (const field of category.fields) {
                if (this.state.modifiedFields.has(field.key)) {
                    modified.push(field);
                }
            }
        }
        return modified;
    }
    getCategories() {
        return this.state.categories.map(c => ({
            ...c,
            fields: [...c.fields],
        }));
    }
    getSuggestions() {
        const suggestions = [];
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
    getDashboardCards() {
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
    searchConfig(query) {
        const q = query.toLowerCase();
        const results = [];
        for (const category of this.state.categories) {
            for (const field of category.fields) {
                if (field.key.toLowerCase().includes(q) || String(field.value).toLowerCase().includes(q) || (field.description ?? '').toLowerCase().includes(q)) {
                    results.push(field);
                }
            }
        }
        return results;
    }
    getModifiedKeys() {
        return Array.from(this.state.modifiedFields);
    }
    resetField(key) {
        this.state.modifiedFields.delete(key);
    }
    resetAll() {
        this.state.modifiedFields.clear();
    }
    exportToConfig() {
        const config = {};
        for (const category of this.state.categories) {
            for (const field of category.fields) {
                config[field.key] = field.value;
            }
        }
        return config;
    }
    getState() {
        return {
            categories: this.state.categories,
            searchQuery: this.state.searchQuery,
            expandedCategories: new Set(this.state.expandedCategories),
            modifiedFields: new Set(this.state.modifiedFields),
        };
    }
    getCompleteConfig() {
        const result = {};
        for (const category of this.state.categories) {
            for (const field of category.fields) {
                result[field.key] = field.value;
            }
        }
        return result;
    }
    getConfigByCategory(category) {
        const cat = this.state.categories.find(c => c.name === category);
        return cat ? [...cat.fields] : [];
    }
    renderField(fieldId) {
        for (const category of this.state.categories) {
            const field = category.fields.find(f => f.key === fieldId);
            if (field) {
                return this.renderFieldHtml(field);
            }
        }
        return '';
    }
    renderCategory(categoryName) {
        const cat = this.state.categories.find(c => c.name === categoryName);
        if (!cat)
            return '';
        const parts = [];
        parts.push(`<div class="config-category" data-category="${cat.name}">`);
        parts.push(`  <h3>${cat.description ?? cat.name}</h3>`);
        for (const field of cat.fields) {
            parts.push(this.renderFieldHtml(field));
        }
        parts.push(`</div>`);
        return parts.join('\n');
    }
    validateVisible() {
        const errors = [];
        for (const category of this.state.categories) {
            for (const field of category.fields) {
                if (field.required && (field.value === null || field.value === undefined)) {
                    errors.push({ key: field.key, error: `Required field "${field.key}" is not set` });
                }
            }
        }
        return errors;
    }
    toJsonSchema() {
        const schema = {
            $schema: 'http://json-schema.org/draft-07/schema#',
            type: 'object',
            properties: {},
            required: [],
        };
        const props = {};
        const required = [];
        for (const category of this.state.categories) {
            for (const field of category.fields) {
                const fieldSchema = {
                    type: field.type === 'array' ? 'array' : field.type,
                    description: field.description ?? '',
                };
                if (field.enum)
                    fieldSchema.enum = field.enum;
                if (field.min !== undefined)
                    fieldSchema.minimum = field.min;
                if (field.max !== undefined)
                    fieldSchema.maximum = field.max;
                props[field.key] = fieldSchema;
                if (field.required)
                    required.push(field.key);
            }
        }
        schema.properties = props;
        schema.required = required;
        return schema;
    }
    getEditorConfig() {
        return {
            minimap: { enabled: false },
            lineNumbers: 'off',
            folding: false,
            wordWrap: 'on',
            renderWhitespace: 'none',
            fontSize: 13,
        };
    }
    renderFieldHtml(field) {
        const value = field.value !== undefined && field.value !== null ? String(field.value) : '';
        const readonly = field.readonly ? ' readonly' : '';
        const desc = field.description ? `<small style="color:#888;display:block;margin-top:2px;">${field.description}</small>` : '';
        let input = '';
        if (field.type === 'boolean') {
            const checked = field.value ? ' checked' : '';
            input = `<label><input type="checkbox"${checked}${readonly} data-key="${field.key}" class="config-toggle"> ${field.description ?? ''}</label>`;
        }
        else if (field.enum) {
            const options = field.enum.map(v => `<option value="${String(v)}"${value === String(v) ? ' selected' : ''}>${String(v)}</option>`).join('');
            input = `<select data-key="${field.key}"${readonly} class="config-select">${options}</select>${desc}`;
        }
        else if (field.type === 'number') {
            input = `<input type="number" value="${value}"${readonly} data-key="${field.key}" class="config-input"${field.min !== undefined ? ` min="${field.min}"` : ''}${field.max !== undefined ? ` max="${field.max}"` : ''}>${desc}`;
        }
        else {
            input = `<input type="text" value="${value}"${readonly} data-key="${field.key}" class="config-input" placeholder="${field.description ?? ''}">${desc}`;
        }
        return `<div class="config-field" style="margin-bottom:12px;">
  <label style="display:block;font-size:13px;font-weight:500;margin-bottom:4px;color:#d4d4d4;">${field.key}</label>
  ${input}
</div>`;
    }
}
exports.ConfigUI = ConfigUI;
function createConfigUI() {
    return new ConfigUI();
}
//# sourceMappingURL=config-ui.js.map