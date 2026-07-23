import { ContextStore, DEFAULT_CONTEXT_STORE_CONFIG, estimateTokens, createContextItem } from '../runtime/context-store';

describe('ContextStore', () => {
  it('constructor uses defaults', () => {
    const store = new ContextStore();
    const config = store.getConfig();
    expect(config.maxItems).toBe(500);
  });

  it('constructor merges custom config', () => {
    const store = new ContextStore({ maxItems: 10 });
    expect(store.getConfig().maxItems).toBe(10);
  });

  it('add and get item', () => {
    const store = new ContextStore({ maxItems: 100 });
    const item = createContextItem('test.ts', 'content', 'file');
    store.add(item);
    expect(store.get(item.id)).toBeDefined();
    expect(store.get(item.id)!.source).toBe('test.ts');
  });

  it('get returns undefined for missing', () => {
    const store = new ContextStore();
    expect(store.get('missing')).toBeUndefined();
  });

  it('getConfig returns config', () => {
    const store = new ContextStore({ maxTotalTokens: 50000 });
    expect(store.getConfig().maxTotalTokens).toBe(50000);
    expect(store.getConfig().maxItems).toBe(500);
  });

  it('estimateTokens returns correct count', () => {
    expect(estimateTokens('hello world')).toBe(4);
    expect(estimateTokens('')).toBe(0);
  });

  it('DEFAULT_CONTEXT_STORE_CONFIG has expected values', () => {
    expect(DEFAULT_CONTEXT_STORE_CONFIG.maxItems).toBe(500);
    expect(DEFAULT_CONTEXT_STORE_CONFIG.maxTokensPerItem).toBe(8000);
    expect(DEFAULT_CONTEXT_STORE_CONFIG.maxTotalTokens).toBe(128000);
    expect(DEFAULT_CONTEXT_STORE_CONFIG.ttlMs).toBe(3600000);
  });
});
