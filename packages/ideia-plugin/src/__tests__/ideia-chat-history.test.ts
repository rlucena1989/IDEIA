import { ChatHistory } from '../browser/ideia-chat-history';

const mockEl = { style: new Proxy({} as Record<string, string>, { get(t, p) { return p === 'cssText' ? '' : t[p as string]; }, set(t, p, v) { if (typeof p === 'string') t[p] = v; return true; } }), appendChild: () => {}, querySelector: () => null, remove: () => {} };
if (typeof document === 'undefined') (globalThis as Record<string, unknown>).document = { createElement: () => mockEl };

describe('ChatHistory', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
  });

  it('constructs with container and callbacks', () => {
    const onSelect = jest.fn();
    const onDelete = jest.fn();
    const onClose = jest.fn();

    const history = new ChatHistory(container, '/chats.json', { onSelect, onDelete, onClose });
    expect(history).toBeDefined();
  });

  it('provides saveConversation method', () => {
    const history = new ChatHistory(container, '/chats.json', {
      onSelect: jest.fn(),
      onDelete: jest.fn(),
      onClose: jest.fn(),
    });

    const conv = { id: '1', title: 'Test', messageCount: 0, createdAt: '', updatedAt: '' };
    history.saveConversation(conv);
    const loaded = history.loadConversation('1');
    expect(loaded).toEqual(conv);
  });

  it('provides loadConversation method', () => {
    const history = new ChatHistory(container, '/chats.json', {
      onSelect: jest.fn(),
      onDelete: jest.fn(),
      onClose: jest.fn(),
    });

    expect(history.loadConversation('nonexistent')).toBeUndefined();
  });

  it('provides deleteConversation method', () => {
    const onDelete = jest.fn();
    const history = new ChatHistory(container, '/chats.json', {
      onSelect: jest.fn(),
      onDelete,
      onClose: jest.fn(),
    });

    history.saveConversation({ id: '1', title: 'T', messageCount: 0, createdAt: '', updatedAt: '' });
    history.deleteConversation('1');
    expect(history.loadConversation('1')).toBeUndefined();
    expect(onDelete).toHaveBeenCalledWith('1');
  });

  it('provides searchConversations method', () => {
    const history = new ChatHistory(container, '/chats.json', {
      onSelect: jest.fn(),
      onDelete: jest.fn(),
      onClose: jest.fn(),
    });

    history.saveConversation({ id: '1', title: 'Test Chat', snippet: 'Hello world', messageCount: 1, createdAt: '', updatedAt: '' });
    const results = history.searchConversations('Hello');
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe('1');
  });

  it('allows mount and unmount lifecycle', () => {
    const history = new ChatHistory(container, '/chats.json', {
      onSelect: jest.fn(),
      onDelete: jest.fn(),
      onClose: jest.fn(),
    });

    expect(() => history.mount()).not.toThrow();
    expect(() => history.unmount()).not.toThrow();
  });
});
