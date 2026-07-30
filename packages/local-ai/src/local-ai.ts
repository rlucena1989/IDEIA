import { LocalAiConfig, HardwareInfo, LocalModelInfo, LocalInferenceResult, LocalInferenceConfig, LocalEmbeddingResult, LocalEmbeddingConfig, AvailableModel } from './types';
import { HardwareDetector } from './hardware';
import { ModelManager } from './model-manager';
import { LocalInference } from './inference';
import { createLogger } from '@ideia/logger';

const log = createLogger('local-ai');

const DEFAULT_CONFIG: LocalAiConfig = {
  ollamaEndpoint: 'http://127.0.0.1:11434',
  defaultModel: 'llama3.2:3b',
  defaultEmbeddingModel: 'nomic-embed-text:v1.5',
  hardwareBackend: 'auto',
  fallbackToCloud: true,
};

export class LocalAiEngine {
  private config: LocalAiConfig;
  private hardware: HardwareDetector;
  private modelManager: ModelManager;
  private inference: LocalInference;
  private hardwareInfo: HardwareInfo | null = null;

  constructor(config?: Partial<LocalAiConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.hardware = new HardwareDetector();
    this.modelManager = new ModelManager(this.config);
    this.inference = new LocalInference(this.config);
  }

  async initialize(): Promise<{ success: boolean; hardware: HardwareInfo; ollamaRunning: boolean }> {
    this.hardwareInfo = this.hardware.detect();
    const ollamaRunning = await this.modelManager.checkOllama();
    const defaultModel = this.config.defaultModel ?? 'llama3.2:3b';

    log.info('Local AI Engine initialized', {
      platform: this.hardwareInfo.platform,
      memory: `${this.hardwareInfo.totalMemoryGb}GB`,
      backend: this.hardwareInfo.recommendedBackend,
      ollamaRunning,
      defaultModel,
    });

    return {
      success: true,
      hardware: this.hardwareInfo,
      ollamaRunning,
    };
  }

  async generate(config: LocalInferenceConfig): Promise<LocalInferenceResult> {
    return this.inference.generate(config);
  }

  async generateStream(config: LocalInferenceConfig): Promise<AsyncIterable<string>> {
    return this.inference.generateStream(config);
  }

  async embed(config: LocalEmbeddingConfig): Promise<LocalEmbeddingResult> {
    return this.inference.embed(config);
  }

  getModelManager(): ModelManager {
    return this.modelManager;
  }

  getHardwareInfo(): HardwareInfo | null {
    return this.hardwareInfo;
  }

  async listModels(): Promise<LocalModelInfo[]> {
    return this.modelManager.listInstalled();
  }

  async pullModel(name: string): Promise<void> {
    return this.modelManager.pull(name);
  }

  async removeModel(name: string): Promise<boolean> {
    return this.modelManager.remove(name);
  }

  getRecommendedModels(): AvailableModel[] {
    const maxMem = this.hardwareInfo?.totalMemoryGb ?? 16;
    return this.modelManager.getRecommendedModels(maxMem);
  }

  getAvailableModels(): AvailableModel[] {
    return this.modelManager.getAvailableModels();
  }

  isOllamaRunning(): boolean {
    return this.modelManager.isOllamaRunning();
  }

  getConfig(): LocalAiConfig {
    return { ...this.config };
  }

  updateConfig(config: Partial<LocalAiConfig>): void {
    this.config = { ...this.config, ...config };
    this.inference = new LocalInference(this.config);
    this.modelManager = new ModelManager(this.config);
    log.info('Local AI config updated', { changes: Object.keys(config) });
  }
}

export function createLocalAiEngine(config?: Partial<LocalAiConfig>): LocalAiEngine {
  return new LocalAiEngine(config);
}
