import { InlineCompletionProvider, createInlineCompletionProvider } from '../inline-completion';

function makeFetchMock(response: unknown, ok = true) {
  return jest.fn().mockResolvedValue({
    ok,
    json: jest.fn().mockResolvedValue(response),
  });
}

describe('InlineCompletionProvider', () => {
  let provider: InlineCompletionProvider;
  let originalFetch: typeof global.fetch;

  beforeAll(() => {
    originalFetch = global.fetch;
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  beforeEach(() => {
    provider = new InlineCompletionProvider();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('creates via factory', () => {
    expect(createInlineCompletionProvider()).toBeInstanceOf(InlineCompletionProvider);
  });

  it('starts as not available when no fetch mock', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('fetch not available'));
    const available = await provider.isAvailable();
    expect(available).toBe(false);
  });

  it('isAvailable returns true when fetch succeeds', async () => {
    global.fetch = makeFetchMock({ models: [{ name: 'test-model' }] });
    const available = await provider.isAvailable();
    expect(available).toBe(true);
  });

  it('setModel updates the model name', () => {
    provider.setModel('custom-model');
    expect(provider.getModel()).toBe('custom-model');
  });

  it('getModel returns default model', () => {
    expect(provider.getModel()).toBeDefined();
  });

  it('provideCompletionItems returns items when fetch succeeds', async () => {
    global.fetch = makeFetchMock({
      model: 'test',
      response: 'completion text here',
    });
    const ctx = { textBeforeCursor: 'console.', textAfterCursor: '', languageId: 'typescript', filePath: '/f.ts', lineContent: 'console.', indentation: '' };
    const result = await provider.provideCompletionItems(ctx);
    expect(result.items.length).toBeGreaterThan(0);
    expect(result.items[0].text).toBeDefined();
  });

  it('provideCompletionItems returns empty on fetch failure', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));
    const ctx = { textBeforeCursor: 'x', textAfterCursor: '', languageId: 'typescript', filePath: '/f.ts', lineContent: 'x', indentation: '' };
    const result = await provider.provideCompletionItems(ctx);
    expect(result.items).toHaveLength(0);
  });

  it('provideCompletionItems returns empty on non-ok response', async () => {
    global.fetch = makeFetchMock({ error: 'bad request' }, false);
    const ctx = { textBeforeCursor: 'x', textAfterCursor: '', languageId: 'typescript', filePath: '/f.ts', lineContent: 'x', indentation: '' };
    const result = await provider.provideCompletionItems(ctx);
    expect(result.items).toHaveLength(0);
  });

  it('accepts custom options', () => {
    const p = new InlineCompletionProvider({ baseUrl: 'http://custom:11434', model: 'custom-model', maxTokens: 256, temperature: 0.5, timeoutMs: 5000 });
    expect(p.getModel()).toBe('custom-model');
  });
});
