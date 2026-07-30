export type FieldType = 'string' | 'number' | 'boolean' | 'select' | 'slider' | 'color' | 'textarea' | 'array';

export interface VisualField {
  key: string;
  label: string;
  type: FieldType;
  description?: string;
  defaultValue?: unknown;
  options?: Array<{ label: string; value: string }>;
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

const DEFAULT_VISUAL_FIELDS: VisualField[] = [
  { key: 'autonomy.level', label: 'Autonomy Level', type: 'select', category: 'autonomy', defaultValue: 'N1', options: [{ label: 'N0 - Manual', value: 'N0' }, { label: 'N1 - Supervised', value: 'N1' }, { label: 'N2 - Semi-Autonomous', value: 'N2' }, { label: 'N3 - Autonomous', value: 'N3' }, { label: 'N4 - Full', value: 'N4' }], order: 1 },
  { key: 'autonomy.maxActionsPerMinute', label: 'Max Actions/Min', type: 'number', category: 'autonomy', defaultValue: 10, min: 1, max: 100, order: 2 },
  { key: 'autonomy.requireApproval', label: 'Require Approval', type: 'boolean', category: 'autonomy', defaultValue: true, order: 3 },
  { key: 'security.sandbox', label: 'Sandbox Enabled', type: 'boolean', category: 'security', defaultValue: true, order: 1 },
  { key: 'security.audit', label: 'Audit Trail', type: 'boolean', category: 'security', defaultValue: true, order: 2 },
  { key: 'security.logLevel', label: 'Log Level', type: 'select', category: 'security', defaultValue: 'info', options: [{ label: 'Debug', value: 'debug' }, { label: 'Info', value: 'info' }, { label: 'Warn', value: 'warn' }, { label: 'Error', value: 'error' }], order: 3 },
  { key: 'security.outputValidation', label: 'Output Validation', type: 'boolean', category: 'security', defaultValue: true, order: 4 },
  { key: 'agent.temperature', label: 'Agent Temperature', type: 'slider', category: 'agents', defaultValue: 0.7, min: 0, max: 1, step: 0.1, order: 1 },
  { key: 'agent.maxTokens', label: 'Max Tokens', type: 'number', category: 'agents', defaultValue: 4096, min: 256, max: 32768, order: 2 },
  { key: 'agent.model', label: 'Model', type: 'select', category: 'agents', defaultValue: 'gpt-4', options: [{ label: 'GPT-4', value: 'gpt-4' }, { label: 'GPT-3.5', value: 'gpt-3.5' }, { label: 'Claude 3', value: 'claude-3' }, { label: 'Local', value: 'local' }], order: 3 },
  { key: 'ui.theme', label: 'Theme', type: 'select', category: 'ui', defaultValue: 'dark', options: [{ label: 'Dark', value: 'dark' }, { label: 'Light', value: 'light' }, { label: 'High Contrast', value: 'high-contrast' }], order: 1 },
  { key: 'ui.fontSize', label: 'Font Size', type: 'number', category: 'ui', defaultValue: 14, min: 8, max: 32, order: 2 },
  { key: 'ui.notifications', label: 'Notifications Enabled', type: 'boolean', category: 'ui', defaultValue: true, order: 3 },
  { key: 'ui.language', label: 'Language', type: 'select', category: 'ui', defaultValue: 'en', options: [{ label: 'English', value: 'en' }, { label: 'Portuguese', value: 'pt-BR' }, { label: 'Spanish', value: 'es' }], order: 4 },
  { key: 'editor.tabSize', label: 'Tab Size', type: 'slider', category: 'editor', defaultValue: 4, min: 1, max: 8, step: 1, order: 1 },
  { key: 'editor.insertSpaces', label: 'Insert Spaces', type: 'boolean', category: 'editor', defaultValue: true, order: 2 },
  { key: 'editor.wordWrap', label: 'Word Wrap', type: 'select', category: 'editor', defaultValue: 'off', options: [{ label: 'Off', value: 'off' }, { label: 'On', value: 'on' }, { label: 'Word Wrap Column', value: 'wordWrapColumn' }], order: 3 },
  { key: 'editor.fontFamily', label: 'Font Family', type: 'string', category: 'editor', defaultValue: 'Fira Code', order: 4 },
  { key: 'editor.minimap', label: 'Minimap Enabled', type: 'boolean', category: 'editor', defaultValue: true, order: 5 },
  { key: 'terminal.shell', label: 'Default Shell', type: 'select', category: 'terminal', defaultValue: 'powershell', options: [{ label: 'PowerShell', value: 'powershell' }, { label: 'Command Prompt', value: 'cmd' }, { label: 'WSL', value: 'wsl' }, { label: 'Git Bash', value: 'bash' }], order: 1 },
  { key: 'terminal.fontSize', label: 'Font Size', type: 'number', category: 'terminal', defaultValue: 13, min: 8, max: 32, order: 2 },
  { key: 'terminal.scrollback', label: 'Scrollback Lines', type: 'number', category: 'terminal', defaultValue: 5000, min: 1000, max: 50000, order: 3 },
  { key: 'llm.provider', label: 'Provider', type: 'select', category: 'llm', defaultValue: 'openai', options: [{ label: 'OpenAI', value: 'openai' }, { label: 'Anthropic', value: 'anthropic' }, { label: 'Ollama', value: 'ollama' }, { label: 'Azure', value: 'azure' }], order: 1 },
  { key: 'llm.model', label: 'Model', type: 'string', category: 'llm', defaultValue: 'gpt-4', order: 2 },
  { key: 'llm.temperature', label: 'Temperature', type: 'slider', category: 'llm', defaultValue: 0.7, min: 0, max: 1, step: 0.1, order: 3 },
  { key: 'llm.maxTokens', label: 'Max Tokens', type: 'number', category: 'llm', defaultValue: 4096, min: 256, max: 65536, order: 4 },
  { key: 'git.autoCommit', label: 'Auto-Commit', type: 'boolean', category: 'git', defaultValue: false, order: 1 },
  { key: 'git.autoPush', label: 'Auto-Push', type: 'boolean', category: 'git', defaultValue: false, order: 2 },
  { key: 'git.signCommits', label: 'Sign Commits', type: 'boolean', category: 'git', defaultValue: false, order: 3 },
  { key: 'logging.level', label: 'Level', type: 'select', category: 'logging', defaultValue: 'info', options: [{ label: 'Debug', value: 'debug' }, { label: 'Info', value: 'info' }, { label: 'Warn', value: 'warn' }, { label: 'Error', value: 'error' }], order: 1 },
  { key: 'logging.format', label: 'Format', type: 'select', category: 'logging', defaultValue: 'json', options: [{ label: 'JSON', value: 'json' }, { label: 'Text', value: 'text' }], order: 2 },
];

export class VisualSchema {
  private fields: Map<string, VisualField> = new Map();
  private categories: Map<string, { label: string; order: number }> = new Map();
  private fieldDependencies: Map<string, string[]> = new Map();

  constructor() {
    this.addFields(DEFAULT_VISUAL_FIELDS);
  }

  addField(field: VisualField): void {
    this.fields.set(field.key, field);
    if (!this.categories.has(field.category)) {
      this.categories.set(field.category, { label: field.category, order: Object.keys(this.categories).length });
    }
  }

  addFields(fields: VisualField[]): void {
    for (const f of fields) this.addField(f);
  }

  addDependency(fieldId: string, dependsOn: string): void {
    const deps = this.fieldDependencies.get(fieldId) ?? [];
    if (!deps.includes(dependsOn)) {
      deps.push(dependsOn);
      this.fieldDependencies.set(fieldId, deps);
    }
  }

  getField(key: string): VisualField | undefined {
    return this.fields.get(key);
  }

  getFieldSchema(fieldId: string): Record<string, unknown> {
    const field = this.fields.get(fieldId);
    if (!field) return {};
    const schema: Record<string, unknown> = {
      type: field.type === 'select' ? 'string' : field.type,
      title: field.label,
      description: field.description ?? '',
    };
    if (field.options) {
      schema.enum = field.options.map(o => o.value);
    }
    if (field.min !== undefined) schema.minimum = field.min;
    if (field.max !== undefined) schema.maximum = field.max;
    if (field.defaultValue !== undefined) schema.default = field.defaultValue;
    if (field.required) schema.minLength = 1;
    return schema;
  }

  getFieldCategory(fieldId: string): string | undefined {
    return this.fields.get(fieldId)?.category;
  }

  getFieldDependencies(fieldId: string): string[] {
    return [...(this.fieldDependencies.get(fieldId) ?? [])];
  }

  getAllFields(): VisualField[] {
    return Array.from(this.fields.values()).sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
  }

  getFieldsByCategory(category: string): VisualField[] {
    return this.getAllFields().filter(f => f.category === category);
  }

  getCategories(): Array<{ id: string; label: string; order: number }> {
    return Array.from(this.categories.entries())
      .map(([id, c]) => ({ id, label: c.label, order: c.order }))
      .sort((a, b) => a.order - b.order);
  }

  getFieldWidget(field: VisualField): WidgetType {
    const widgetMap: Record<string, WidgetType> = {
      string: { type: 'input', helperText: field.description, group: field.category },
      number: { type: 'input', helperText: field.description, group: field.category },
      boolean: { type: 'toggle', helperText: field.description, group: field.category },
      select: { type: 'select', helperText: field.description, group: field.category },
      slider: { type: 'slider', helperText: field.description, group: field.category },
      color: { type: 'color-picker', helperText: field.description, group: field.category },
      textarea: { type: 'textarea', helperText: field.description, group: field.category },
      array: { type: 'array-editor', helperText: field.description, group: field.category },
    };
    const widget = widgetMap[field.type] ?? { type: 'input', group: field.category };
    if (field.required) widget.validationMessage = `${field.label} is required`;
    return widget;
  }

  getFieldGroups(): Array<{ id: string; label: string; order: number; fields: VisualField[] }> {
    return this.getCategories().map(c => ({
      ...c,
      fields: this.getFieldsByCategory(c.id),
    }));
  }

  generateUISchema(): Record<string, unknown> {
    const uiSchema: Record<string, unknown> = {};
    for (const [key, field] of this.fields) {
      const entry: Record<string, unknown> = {
        'ui:widget': field.type === 'boolean' ? 'toggle' : field.type === 'textarea' ? 'textarea' : field.type === 'slider' ? 'range' : field.type,
      };
      if (field.type === 'slider') {
        if (field.min !== undefined) entry['ui:options'] = { min: field.min, max: field.max, step: field.step ?? 1 };
      }
      uiSchema[key] = entry;
    }
    return uiSchema;
  }
}

export function createVisualSchema(): VisualSchema {
  return new VisualSchema();
}
