import { injectable } from '@theia/core/shared/inversify';
import { createLogger } from '@ideia/logger';
import type { IEventBus } from '@ideia/event-bus';
import type {  } from '@ideia/event-bus';
import {
  IDEIA_ConfigService, ConfigEntry,
} from '../common/ideia-protocol';
const logger = createLogger('config-service');

@injectable()
export class IDEIA_ConfigBackendService implements IDEIA_ConfigService {
  private config = new Map<string, ConfigEntry>();
  private eventBus: IEventBus;

  constructor(eventBus: IEventBus) {
    this.eventBus = eventBus;
    this.initializeDefaults();
  }

  private initializeDefaults(): void {
    this.config.set('ideia.autonomy.level', {
      key: 'ideia.autonomy.level',
      value: 'guided',
      type: 'string',
      description: 'Current autonomy level (blocked, guided, autonomous)',
    });
    this.config.set('ideia.ui.theme', {
      key: 'ideia.ui.theme',
      value: 'dark',
      type: 'string',
      description: 'IDEIA UI theme',
    });
    this.config.set('ideia.llm.provider', {
      key: 'ideia.llm.provider',
      value: 'ollama',
      type: 'string',
      description: 'Active LLM provider',
    });
    this.config.set('ideia.llm.apiKey', {
      key: 'ideia.llm.apiKey',
      value: '',
      type: 'string',
      description: 'LLM API Key',
    });
    this.config.set('ideia.llm.endpoint', {
      key: 'ideia.llm.endpoint',
      value: '',
      type: 'string',
      description: 'Custom LLM endpoint URL',
    });
    this.config.set('ideia.llm.model', {
      key: 'ideia.llm.model',
      value: 'gpt-4o-mini',
      type: 'string',
      description: 'Default LLM model name',
    });
    this.config.set('ideia.llm.reasoning', {
      key: 'ideia.llm.reasoning',
      value: false,
      type: 'boolean',
      description: 'Enable reasoning models (o1/o3/r1)',
    });
    this.config.set('ideia.llm.maxTokens', {
      key: 'ideia.llm.maxTokens',
      value: 4096,
      type: 'number',
      description: 'Max tokens per response',
    });
    this.config.set('ideia.llm.temperature', {
      key: 'ideia.llm.temperature',
      value: 0.7,
      type: 'number',
      description: 'LLM temperature',
    });
    this.config.set('ideia.chat.maxHistory', {
      key: 'ideia.chat.maxHistory',
      value: 100,
      type: 'number',
      description: 'Maximum conversation history entries',
    });
    this.config.set('ideia.features.experimental', {
      key: 'ideia.features.experimental',
      value: false,
      type: 'boolean',
      description: 'Enable experimental features',
    });
  }

  async getFullConfig(): Promise<Record<string, unknown>> {
    const result: Record<string, unknown> = {};
    for (const [key, entry] of this.config) {
      result[key] = entry.value;
    }
    return result;
  }

  async getConfig(path: string): Promise<ConfigEntry> {
    const entry = this.config.get(path);
    if (!entry) {
      return {
        key: path,
        value: null,
        type: 'string',
        description: 'Not found',
      };
    }
    return { ...entry };
  }

  async setConfig(path: string, value: unknown): Promise<void> {
    const valueType = typeof value as ConfigEntry['type'];
    this.config.set(path, {
      key: path,
      value,
      type: valueType,
      description: undefined,
    });

    await this.eventBus.emit({
      type: 'config.changed',
      source: 'ideia-config',
      payload: { config: { key: path, value } },
    });
  }

  async resetConfig(): Promise<void> {
    this.config.clear();
    this.initializeDefaults();
    await this.eventBus.emit({
      type: 'config.changed',
      source: 'ideia-config',
      payload: { config: { key: 'all', value: 'reset' } },
    });
  }
}
