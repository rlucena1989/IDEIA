import { OpenHandlerChain, IOpenHandler } from '../open-handler';
import { IEditorWidget } from '../types';

describe('OpenHandlerChain', () => {
  let chain: OpenHandlerChain;

  const createHandler = (id: string, priority: number, handles: string[]): IOpenHandler => ({
    id,
    label: `Handler ${id}`,
    priority,
    canHandle: jest.fn((uri: string) => handles.some(h => uri.endsWith(h))),
    open: jest.fn(async (uri: string): Promise<IEditorWidget | undefined> => ({
      uri,
      id: `${id}-widget`,
      title: uri,
      dirty: false,
      closed: false,
      open: jest.fn(),
      close: jest.fn(),
      save: jest.fn(async () => true),
      focus: jest.fn(),
      isActive: jest.fn(() => true),
      onDirtyChanged: jest.fn(() => ({ dispose: jest.fn() })),
      onClosed: jest.fn(() => ({ dispose: jest.fn() })),
      onFocus: jest.fn(() => ({ dispose: jest.fn() })),
    })),
  });

  const createNullHandler = (id: string, priority: number, handles: string[]): IOpenHandler => ({
    id,
    label: `Null ${id}`,
    priority,
    canHandle: jest.fn((uri: string) => handles.some(h => uri.endsWith(h))),
    open: jest.fn(async (): Promise<IEditorWidget | undefined> => undefined),
  });

  beforeEach(() => {
    chain = new OpenHandlerChain();
  });

  describe('registerHandler', () => {
    it('registers a handler', () => {
      const handler = createHandler('ts', 5, ['.ts']);
      chain.registerHandler(handler);
      expect(chain.getHandlers()).toHaveLength(1);
    });

    it('sorts handlers by priority descending', () => {
      const low = createHandler('low', 1, ['.ts']);
      const high = createHandler('high', 10, ['.ts']);
      const mid = createHandler('mid', 5, ['.ts']);
      chain.registerHandler(low);
      chain.registerHandler(high);
      chain.registerHandler(mid);
      const handlers = chain.getHandlers();
      expect(handlers[0].id).toBe('high');
      expect(handlers[1].id).toBe('mid');
      expect(handlers[2].id).toBe('low');
    });

    it('returns a disposable that unregisters the handler', () => {
      const handler = createHandler('ts', 5, ['.ts']);
      const disposable = chain.registerHandler(handler);
      expect(chain.getHandlers()).toHaveLength(1);
      disposable.dispose();
      expect(chain.getHandlers()).toHaveLength(0);
    });
  });

  describe('open', () => {
    it('returns undefined when no handler can handle the uri', async () => {
      const result = await chain.open('file.unknown');
      expect(result).toBeUndefined();
    });

    it('calls the first matching handler', async () => {
      const handler = createHandler('ts', 5, ['.ts']);
      chain.registerHandler(handler);
      const result = await chain.open('file.ts');
      expect(result).toBeDefined();
      expect(handler.canHandle).toHaveBeenCalledWith('file.ts');
      expect(handler.open).toHaveBeenCalledWith('file.ts');
    });

    it('tries handlers in priority order', async () => {
      const low = createNullHandler('low', 1, ['.ts']);
      const high = createHandler('high', 10, ['.ts']);
      chain.registerHandler(low);
      chain.registerHandler(high);
      const result = await chain.open('file.ts');
      expect(result).toBeDefined();
      expect(result!.id).toBe('high-widget');
    });

    it('falls through to next handler if higher priority returns undefined', async () => {
      const nullHandler = createNullHandler('null', 10, ['.ts']);
      const realHandler = createHandler('real', 5, ['.ts']);
      chain.registerHandler(nullHandler);
      chain.registerHandler(realHandler);
      const result = await chain.open('file.ts');
      expect(result).toBeDefined();
      expect(result!.id).toBe('real-widget');
    });

    it('does not call lower priority handlers if higher returns a widget', async () => {
      const high = createHandler('high', 10, ['.ts']);
      const low = createHandler('low', 5, ['.ts']);
      chain.registerHandler(high);
      chain.registerHandler(low);
      await chain.open('file.ts');
      expect(low.canHandle).not.toHaveBeenCalled();
    });
  });

  describe('getHandlers', () => {
    it('returns an empty array initially', () => {
      expect(chain.getHandlers()).toEqual([]);
    });

    it('returns a copy of the handlers array', () => {
      const handler = createHandler('ts', 5, ['.ts']);
      chain.registerHandler(handler);
      const handlers = chain.getHandlers();
      handlers.push(createHandler('extra', 1, []));
      expect(chain.getHandlers()).toHaveLength(1);
    });
  });
});
