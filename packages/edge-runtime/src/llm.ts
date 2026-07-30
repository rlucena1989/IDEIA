import { createHash } from 'crypto';
import { createLogger } from '@ideia/logger';
import { EdgeModel } from './types';
const logger = createLogger('llm');

export class EdgeLLM {
  private models: Map<string, EdgeModel> = new Map();
  private cache: Map<string, { response: string; timestamp: number }> = new Map();
  private cacheTTL = 3600000;

  registerModel(model: EdgeModel): void { this.models.set(model.name, model); }
  getModel(name: string): EdgeModel | undefined { return this.models.get(name); }
  listModels(): EdgeModel[] { return Array.from(this.models.values()); }

  async generate(modelName: string, prompt: string): Promise<string> {
    const cacheKey = createHash('sha256').update(`${modelName}:${prompt}`).digest('hex');
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) return cached.response;
    const response = `[${modelName} simulated response to: ${prompt.slice(0, 50)}...]`;
    this.cache.set(cacheKey, { response, timestamp: Date.now() });
    return response;
  }

  healthCheck(): { healthy: boolean; modelsAvailable: number; cacheSize: number } {
    return { healthy: this.models.size > 0, modelsAvailable: this.models.size, cacheSize: this.cache.size };
  }
}
