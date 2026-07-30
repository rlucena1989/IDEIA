import { LocalModelInfo, AvailableModel, LocalAiConfig } from './types';
import { createLogger } from '@ideia/logger';
import * as fs from 'fs';

const log = createLogger('local-ai:model-manager');

const OLLAMA_MODELS_API = 'http://127.0.0.1:11434/api/tags';
const OLLAMA_PULL_API = 'http://127.0.0.1:11434/api/pull';

const KNOWN_LOCAL_MODELS: AvailableModel[] = [
  { name: 'llama3.1:8b', size: '4.7GB', description: 'Meta Llama 3.1 8B - best for general purpose', recommended: true },
  { name: 'llama3.1:70b', size: '40GB', description: 'Meta Llama 3.1 70B - high quality, needs lots of RAM', recommended: false },
  { name: 'llama3.1:405b', size: '230GB', description: 'Meta Llama 3.1 405B - needs enterprise hardware', recommended: false },
  { name: 'mistral:7b', size: '4.1GB', description: 'Mistral 7B - fast, efficient', recommended: false },
  { name: 'mixtral:8x7b', size: '26GB', description: 'Mixtral 8x7B - mixture of experts', recommended: false },
  { name: 'codellama:7b', size: '3.8GB', description: 'Code Llama 7B - optimized for code', recommended: false },
  { name: 'codellama:34b', size: '19GB', description: 'Code Llama 34B - advanced code generation', recommended: false },
  { name: 'phi3:mini', size: '2.3GB', description: 'Phi-3 Mini 3.8B - small but capable', recommended: true },
  { name: 'phi3:medium', size: '7GB', description: 'Phi-3 Medium 14B - balanced', recommended: false },
  { name: 'nomic-embed-text:v1.5', size: '0.3GB', description: 'Nomic Embed Text - embeddings model', recommended: true },
  { name: 'mxbai-embed-large:v1', size: '0.7GB', description: 'mxbai Embed Large - high quality embeddings', recommended: false },
  { name: 'llama3.2:1b', size: '0.7GB', description: 'Llama 3.2 1B - ultra lightweight', recommended: false },
  { name: 'llama3.2:3b', size: '2.0GB', description: 'Llama 3.2 3B - lightweight', recommended: true },
  { name: 'qwen2.5:7b', size: '4.7GB', description: 'Qwen 2.5 7B - strong multilingual', recommended: false },
  { name: 'deepseek-coder:6.7b', size: '3.8GB', description: 'DeepSeek Coder 6.7B - code specialist', recommended: false },
];

export class ModelManager {
  private config: LocalAiConfig;
  private localModels: Map<string, LocalModelInfo> = new Map();
  private ollamaAvailable = false;

  constructor(config: LocalAiConfig) {
    this.config = config;
  }

  async checkOllama(): Promise<boolean> {
    try {
      const response = await fetch(this.config.ollamaEndpoint ?? OLLAMA_MODELS_API, { signal: AbortSignal.timeout(3000) });
      this.ollamaAvailable = response.ok;
      return this.ollamaAvailable;
    } catch {
      this.ollamaAvailable = false;
      return false;
    }
  }

  async listInstalled(): Promise<LocalModelInfo[]> {
    if (!this.ollamaAvailable) await this.checkOllama();
    if (!this.ollamaAvailable) return [];

    try {
      const response = await fetch(this.config.ollamaEndpoint ?? OLLAMA_MODELS_API, { signal: AbortSignal.timeout(5000) });
      if (!response.ok) return [];
      const data = await response.json() as { models: Array<{ name: string; size: number; modified_at: string; digest: string }> };
      this.localModels.clear();
      for (const m of data.models ?? []) {
        this.localModels.set(m.name, {
          name: m.name,
          size: this.formatSize(m.size),
          format: 'gguf',
          status: 'ready',
          contextLength: 8192,
          lastUsed: Date.parse(m.modified_at) || undefined,
        });
      }
      return Array.from(this.localModels.values());
    } catch {
      log.warn('Failed to list installed models');
      return [];
    }
  }

  async pull(modelName: string): Promise<void> {
    const model = this.localModels.get(modelName) ?? { name: modelName } as LocalModelInfo;
    model.status = 'downloading';
    model.downloadProgress = 0;
    this.localModels.set(modelName, model);

    try {
      const response = await fetch(this.config.ollamaEndpoint?.replace('/api/tags', '/api/pull') ?? OLLAMA_PULL_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: modelName, stream: false }),
        signal: AbortSignal.timeout(300000),
      });
      if (!response.ok) {
        model.status = 'error';
        log.error(`Failed to pull model ${modelName}: ${response.statusText}`);
        return;
      }
      model.status = 'ready';
      model.downloadProgress = 100;
      this.localModels.set(modelName, model);
      log.info(`Model ${modelName} downloaded successfully`);
    } catch (err) {
      model.status = 'error';
      log.error(`Failed to pull model ${modelName}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  async remove(modelName: string): Promise<boolean> {
    try {
      const response = await fetch(`http://127.0.0.1:11434/api/delete`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: modelName }),
      });
      if (response.ok) {
        this.localModels.delete(modelName);
        log.info(`Model ${modelName} removed`);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  getInfo(modelName: string): LocalModelInfo | undefined {
    return this.localModels.get(modelName);
  }

  getAvailableModels(): AvailableModel[] {
    return KNOWN_LOCAL_MODELS;
  }

  getRecommendedModels(maxMemoryGb: number): AvailableModel[] {
    return KNOWN_LOCAL_MODELS.filter(m => {
      const sizeGb = parseFloat(m.size.replace('GB', '').replace('MB', ''));
      const isMb = m.size.includes('MB');
      return isMb || sizeGb <= maxMemoryGb * 0.7;
    }).filter(m => m.recommended);
  }

  isOllamaRunning(): boolean {
    return this.ollamaAvailable;
  }

  private formatSize(bytes: number): string {
    const gb = bytes / (1024 ** 3);
    if (gb >= 1) return `${gb.toFixed(1)}GB`;
    const mb = bytes / (1024 ** 2);
    return `${mb.toFixed(0)}MB`;
  }

  private ensureDir(dir: string): void {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
}

export function createModelManager(config: LocalAiConfig): ModelManager {
  return new ModelManager(config);
}
