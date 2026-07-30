import * as React from 'react';

export interface ConfigField {
  id: string;
  label: string;
  type: 'text' | 'select' | 'toggle' | 'slider' | 'number';
  value: unknown;
  defaultValue: unknown;
  options?: { value: string; label: string }[];
  min?: number;
  max?: number;
  step?: number;
}

export interface ConfigSection {
  id: string;
  label: string;
  icon: string;
  fields: ConfigField[];
}

interface SectionProps {
  section: ConfigSection;
  onChange: (fieldId: string, value: unknown) => void;
  onReset: () => void;
  modifiedFields: Set<string>;
}

function FieldInput({ field, onChange }: { field: ConfigField; onChange: (value: unknown) => void }): React.ReactElement {
  const style: React.CSSProperties = {
    width: '100%',
    padding: '4px 8px',
    borderRadius: '4px',
    border: '1px solid var(--theia-border-color)',
    background: 'var(--theia-input-background)',
    color: 'var(--theia-foreground)',
    fontSize: '12px',
    fontFamily: 'var(--theia-ui-font-family)',
  };

  switch (field.type) {
    case 'toggle': {
      const checked = Boolean(field.value);
      return (
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={checked}
            onChange={e => onChange(e.target.checked)}
            style={{ accentColor: 'var(--theia-button-background)' }}
          />
          <span style={{ fontSize: '12px' }}>{checked ? 'Enabled' : 'Disabled'}</span>
        </label>
      );
    }
    case 'select':
      return (
        <select value={String(field.value)} onChange={e => onChange(e.target.value)} style={style}>
          {(field.options ?? []).map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      );
    case 'slider': {
      const numVal = Number(field.value);
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <input
            type="range"
            min={field.min ?? 0}
            max={field.max ?? 100}
            step={field.step ?? 1}
            value={numVal}
            onChange={e => onChange(Number(e.target.value))}
            style={{ flex: 1, accentColor: 'var(--theia-button-background)' }}
          />
          <span style={{ fontSize: '11px', minWidth: '32px', textAlign: 'right', opacity: 0.7 }}>{numVal}</span>
        </div>
      );
    }
    case 'number':
      return (
        <input
          type="number"
          value={Number(field.value)}
          min={field.min}
          max={field.max}
          step={field.step}
          onChange={e => onChange(Number(e.target.value))}
          style={style}
        />
      );
    default:
      return (
        <input
          type="text"
          value={String(field.value)}
          onChange={e => onChange(e.target.value)}
          style={style}
        />
      );
  }
}

export function ConfigSectionCard({ section, onChange, onReset, modifiedFields }: SectionProps): React.ReactElement {
  return (
    <div style={{
      marginBottom: '16px',
      borderRadius: '6px',
      border: '1px solid var(--theia-border-color)',
      background: 'var(--theia-sideBar-background)',
      overflow: 'hidden',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 14px',
        borderBottom: '1px solid var(--theia-border-color)',
        background: 'var(--theia-editor-background)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 600 }}>
          <span className={`codicon codicon-${section.icon}`} style={{ fontSize: '14px' }} />
          {section.label}
        </div>
        <button
          onClick={onReset}
          style={{
            padding: '3px 10px',
            borderRadius: '4px',
            border: '1px solid var(--theia-border-color)',
            background: 'transparent',
            color: 'var(--theia-foreground)',
            cursor: 'pointer',
            fontSize: '11px',
          }}
        >
          Reset to defaults
        </button>
      </div>
      <div style={{ padding: '12px 14px' }}>
        {section.fields.map(field => {
          const isModified = modifiedFields.has(field.id);
          return (
            <div key={field.id} style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '6px 0',
              borderBottom: '1px solid var(--theia-border-color)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1 }}>
                <span style={{ fontSize: '12px', fontWeight: 500 }}>{field.label}</span>
                {isModified && (
                  <span style={{
                    fontSize: '9px',
                    padding: '1px 5px',
                    borderRadius: '3px',
                    background: 'var(--theia-warningBackground)',
                    color: '#fff',
                    fontWeight: 600,
                  }}>
                    MODIFIED
                  </span>
                )}
              </div>
              <div style={{ width: '200px' }}>
                <FieldInput field={field} onChange={val => onChange(field.id, val)} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function createDefaultConfig(): Record<string, ConfigSection> {
  return {
    general: {
      id: 'general',
      label: 'General',
      icon: 'settings-gear',
      fields: [
        { id: 'theme', label: 'Theme', type: 'select', value: 'dark', defaultValue: 'dark', options: [{ value: 'dark', label: 'Dark' }, { value: 'light', label: 'Light' }, { value: 'high-contrast', label: 'High Contrast' }] },
        { id: 'language', label: 'Language', type: 'select', value: 'en', defaultValue: 'en', options: [{ value: 'en', label: 'English' }, { value: 'pt', label: 'Português' }, { value: 'es', label: 'Español' }] },
        { id: 'autoSaveInterval', label: 'Auto-save interval (s)', type: 'number', value: 30, defaultValue: 30, min: 5, max: 300, step: 5 },
        { id: 'defaultProjectPath', label: 'Default project path', type: 'text', value: '', defaultValue: '' },
      ],
    },
    agents: {
      id: 'agents',
      label: 'Agents',
      icon: 'robot',
      fields: [
        { id: 'defaultAgent', label: 'Default agent', type: 'select', value: 'auto', defaultValue: 'auto', options: [{ value: 'auto', label: 'Auto-select' }, { value: 'analyst', label: 'Analyst' }, { value: 'architect', label: 'Architect' }, { value: 'programmer', label: 'Programmer' }] },
        { id: 'maxConcurrentAgents', label: 'Max concurrent agents', type: 'number', value: 3, defaultValue: 3, min: 1, max: 10, step: 1 },
        { id: 'agentTimeout', label: 'Agent timeout (min)', type: 'number', value: 15, defaultValue: 15, min: 1, max: 120, step: 5 },
        { id: 'autoRetryFailed', label: 'Auto-retry failed tasks', type: 'toggle', value: true, defaultValue: true },
      ],
    },
    llm: {
      id: 'llm',
      label: 'LLM Providers',
      icon: 'hubot',
      fields: [
        { id: 'ideia.llm.provider', label: 'Active provider', type: 'select', value: 'ollama', defaultValue: 'ollama', options: [
          { value: 'ollama', label: 'Ollama (local)' },
          { value: 'openai', label: 'OpenAI' },
          { value: 'openrouter', label: 'OpenRouter' },
          { value: 'deepseek', label: 'DeepSeek' },
          { value: 'groq', label: 'Groq' },
          { value: 'together', label: 'Together AI' },
          { value: 'deepinfra', label: 'DeepInfra' },
          { value: 'fireworks', label: 'Fireworks AI' },
          { value: 'perplexity', label: 'Perplexity' },
          { value: 'cerebras', label: 'Cerebras' },
          { value: 'siliconflow', label: 'SiliconFlow' },
          { value: 'gemini', label: 'Google Gemini' },
          { value: 'anthropic', label: 'Anthropic Claude' },
          { value: 'openai-compatible', label: 'Custom (OpenAI-compatible)' },
        ]},
        { id: 'ideia.llm.apiKey', label: 'API Key', type: 'text', value: '', defaultValue: '' },
        { id: 'ideia.llm.endpoint', label: 'Custom endpoint URL', type: 'text', value: '', defaultValue: '' },
        { id: 'ideia.llm.model', label: 'Default model name', type: 'text', value: 'gpt-4o-mini', defaultValue: 'gpt-4o-mini' },
        { id: 'ideia.llm.reasoning', label: 'Enable reasoning models (o1/o3/r1)', type: 'toggle', value: false, defaultValue: false },
        { id: 'ideia.llm.maxTokens', label: 'Max tokens per response', type: 'number', value: 4096, defaultValue: 4096, min: 256, max: 128000, step: 256 },
        { id: 'ideia.llm.temperature', label: 'Temperature', type: 'slider', value: 0.7, defaultValue: 0.7, min: 0, max: 2, step: 0.1 },
      ],
    },
    security: {
      id: 'security',
      label: 'Security',
      icon: 'lock',
      fields: [
        { id: 'auditLevel', label: 'Audit level', type: 'select', value: 'standard', defaultValue: 'standard', options: [{ value: 'minimal', label: 'Minimal' }, { value: 'standard', label: 'Standard' }, { value: 'strict', label: 'Strict (all actions)' }] },
        { id: 'approvalFlow', label: 'Approval flow', type: 'select', value: 'single', defaultValue: 'single', options: [{ value: 'none', label: 'None' }, { value: 'single', label: 'Single approval' }, { value: 'dual', label: 'Two-person rule' }] },
        { id: 'policyEnforcement', label: 'Policy enforcement', type: 'toggle', value: true, defaultValue: true },
        { id: 'secretScanEnabled', label: 'Secret scanning', type: 'toggle', value: true, defaultValue: true },
        { id: 'maxViolationsBeforeBlock', label: 'Violation limit before block', type: 'number', value: 5, defaultValue: 5, min: 1, max: 50, step: 1 },
      ],
    },
    performance: {
      id: 'performance',
      label: 'Performance',
      icon: 'dashboard',
      fields: [
        { id: 'maxMemoryMB', label: 'Max memory (MB)', type: 'number', value: 1024, defaultValue: 1024, min: 256, max: 16384, step: 256 },
        { id: 'cacheSize', label: 'Cache size (MB)', type: 'number', value: 256, defaultValue: 256, min: 0, max: 4096, step: 64 },
        { id: 'parallelTasks', label: 'Parallel tasks', type: 'number', value: 4, defaultValue: 4, min: 1, max: 16, step: 1 },
        { id: 'enableLazyLoading', label: 'Lazy loading', type: 'toggle', value: true, defaultValue: true },
        { id: 'telemetryEnabled', label: 'Telemetry', type: 'toggle', value: true, defaultValue: true },
      ],
    },
    appearance: {
      id: 'appearance',
      label: 'Appearance',
      icon: 'paintcan',
      fields: [
        { id: 'fontSize', label: 'Font size', type: 'slider', value: 13, defaultValue: 13, min: 10, max: 24, step: 1 },
        { id: 'showTimestamps', label: 'Show timestamps', type: 'toggle', value: true, defaultValue: true },
        { id: 'compactMode', label: 'Compact mode', type: 'toggle', value: false, defaultValue: false },
        { id: 'showStatusBar', label: 'Show status bar', type: 'toggle', value: true, defaultValue: true },
        { id: 'sidebarPosition', label: 'Sidebar position', type: 'select', value: 'left', defaultValue: 'left', options: [{ value: 'left', label: 'Left' }, { value: 'right', label: 'Right' }] },
      ],
    },
  };
}
