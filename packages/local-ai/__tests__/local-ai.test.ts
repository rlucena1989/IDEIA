import { describe, it, expect } from '@jest/globals';
import { LocalAiEngine } from '../src/local-ai';

describe('LocalAiEngine', () => {
  it('can be constructed with defaults', () => {
    const engine = new LocalAiEngine();
    expect(engine).toBeDefined();
    expect(engine.getConfig().defaultModel).toBe('llama3.2:3b');
    expect(engine.getConfig().ollamaEndpoint).toBe('http://127.0.0.1:11434');
  });

  it('can be constructed with custom config', () => {
    const engine = new LocalAiEngine({ defaultModel: 'codellama:7b', ollamaEndpoint: 'http://localhost:11434' });
    expect(engine.getConfig().defaultModel).toBe('codellama:7b');
  });

  it('initialize detects hardware', async () => {
    const engine = new LocalAiEngine();
    const result = await engine.initialize();
    expect(result.success).toBe(true);
    expect(result.hardware).toBeDefined();
    expect(result.hardware.cpuCores).toBeGreaterThan(0);
  });

  it('provides recommended models', () => {
    const engine = new LocalAiEngine();
    const models = engine.getAvailableModels();
    expect(models.length).toBeGreaterThan(0);
    expect(models.some(m => m.name.includes('llama'))).toBe(true);
  });

  it('updateConfig changes engine config', () => {
    const engine = new LocalAiEngine();
    engine.updateConfig({ defaultModel: 'phi3:mini' });
    expect(engine.getConfig().defaultModel).toBe('phi3:mini');
  });

  it('ollama is not running by default', () => {
    const engine = new LocalAiEngine();
    expect(engine.isOllamaRunning()).toBe(false);
  });
});
