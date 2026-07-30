import { describe, it, expect, beforeEach } from '@jest/globals';
import { DefaultAiManager } from '../src/manager';
import { AiProvider, AiRequest, AiResponse } from '../src/types';

describe('DefaultAiManager', () => {
  let manager: DefaultAiManager;
  let mockProvider: AiProvider;

  beforeEach(() => {
    manager = new DefaultAiManager();
    mockProvider = {
      id: 'test-provider',
      name: 'Test Provider',
      chat: async (_request: AiRequest): Promise<AiResponse> => ({
        content: 'Test response',
        finishReason: 'stop',
        latencyMs: 100,
        cached: false,
      }),
      streamChat: async function* (_request: AiRequest) {
        yield { content: 'Test response', done: true };
      },
      isAvailable: async () => true,
    };
  });

  describe('constructor', () => {
    it('should create manager instance', () => {
      expect(manager).toBeInstanceOf(DefaultAiManager);
    });
  });

  describe('registerProvider', () => {
    it('should register provider', () => {
      const disposable = manager.registerProvider(mockProvider);
      expect(disposable).toBeDefined();
      expect(disposable.dispose).toBeInstanceOf(Function);
    });

    it('should set first provider as default', () => {
      manager.registerProvider(mockProvider);
      const defaultProvider = manager.getDefaultProvider();
      expect(defaultProvider).toEqual(mockProvider);
    });
  });

  describe('unregisterProvider', () => {
    it('should unregister provider', () => {
      manager.registerProvider(mockProvider);
      manager.unregisterProvider('test-provider');
      const provider = manager.getProvider('test-provider');
      expect(provider).toBeUndefined();
    });
  });

  describe('getProvider', () => {
    it('should return undefined for non-existent provider', () => {
      const provider = manager.getProvider('non-existent');
      expect(provider).toBeUndefined();
    });

    it('should return registered provider', () => {
      manager.registerProvider(mockProvider);
      const provider = manager.getProvider('test-provider');
      expect(provider).toEqual(mockProvider);
    });
  });

  describe('getProviders', () => {
    it('should return empty array initially', () => {
      const providers = manager.getProviders();
      expect(providers).toEqual([]);
    });

    it('should return all registered providers', () => {
      manager.registerProvider(mockProvider);
      const providers = manager.getProviders();
      expect(providers).toHaveLength(1);
    });
  });

  describe('setDefaultProvider', () => {
    it('should set default provider', () => {
      manager.registerProvider(mockProvider);
      manager.setDefaultProvider('test-provider');
      const defaultProvider = manager.getDefaultProvider();
      expect(defaultProvider).toEqual(mockProvider);
    });

    it('should not set default for non-existent provider', () => {
      manager.registerProvider(mockProvider);
      manager.setDefaultProvider('non-existent');
      const defaultProvider = manager.getDefaultProvider();
      expect(defaultProvider).toEqual(mockProvider);
    });
  });

  describe('getDefaultProvider', () => {
    it('should return undefined when no providers', () => {
      const provider = manager.getDefaultProvider();
      expect(provider).toBeUndefined();
    });
  });

  describe('chat', () => {
    it('should throw error when no provider configured', async () => {
      const request: AiRequest = {
        messages: [{ role: 'user', content: 'test' }],
      };
      await expect(manager.chat(request)).rejects.toThrow('No AI provider configured');
    });

    it('should send chat request to default provider', async () => {
      manager.registerProvider(mockProvider);
      const request: AiRequest = {
        messages: [{ role: 'user', content: 'test' }],
      };
      const response = await manager.chat(request);
      expect(response).toBeDefined();
      expect(response.content).toBe('Test response');
    });
  });

  describe('onProviderRegistered', () => {
    it('should fire event when provider registered', () => {
      let fired = false;
      manager.onProviderRegistered(() => {
        fired = true;
      });
      manager.registerProvider(mockProvider);
      expect(fired).toBe(true);
    });
  });

  describe('onProviderUnregistered', () => {
    it('should fire event when provider unregistered', () => {
      manager.registerProvider(mockProvider);
      let fired = false;
      manager.onProviderUnregistered(() => {
        fired = true;
      });
      manager.unregisterProvider('test-provider');
      expect(fired).toBe(true);
    });
  });
});
