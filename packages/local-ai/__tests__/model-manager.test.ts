import { describe, it, expect } from '@jest/globals';
import { ModelManager } from '../src/model-manager';

describe('ModelManager', () => {
  it('provides available models list', () => {
    const manager = new ModelManager({});
    const models = manager.getAvailableModels();
    expect(models.length).toBeGreaterThan(0);
    expect(models.some(m => m.recommended)).toBe(true);
  });

  it('provides recommended models based on memory', () => {
    const manager = new ModelManager({});
    const recommended = manager.getRecommendedModels(32);
    expect(recommended.length).toBeGreaterThan(0);
    expect(recommended.every(m => m.recommended)).toBe(true);
  });

  it('ollama is not running by default', () => {
    const manager = new ModelManager({});
    expect(manager.isOllamaRunning()).toBe(false);
  });
});
