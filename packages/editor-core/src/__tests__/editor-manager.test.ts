import { DefaultEditorManager } from '../editor-manager';
import { EditorWidgetFactory, IEditorWidget } from '../types';

describe('DefaultEditorManager', () => {
  let manager: DefaultEditorManager;

  const createMockFactory = (id: string, priority: number, handles: string[]): EditorWidgetFactory => ({
    id,
    priority,
    canHandle: jest.fn((uri: string) => handles.some(h => uri.endsWith(h))),
    createWidget: jest.fn(async (uri: string): Promise<IEditorWidget> => ({
      uri,
      id: `${id}-${Date.now()}`,
      title: `Editor: ${uri}`,
      dirty: false,
      closed: false,
      open: jest.fn(),
      close: jest.fn(),
      save: jest.fn(async () => true),
      focus: jest.fn(),
      isActive: jest.fn(() => true),
      onDirtyChanged: jest.fn(),
      onClosed: jest.fn(),
      onFocus: jest.fn(),
    })),
  });

  const _mockWidget: IEditorWidget = {
    uri: 'file:///test.ts',
    id: 'test-widget',
    title: 'test.ts',
    dirty: false,
    closed: false,
    open: jest.fn(),
    close: jest.fn(),
    save: jest.fn(async () => true),
    focus: jest.fn(),
    isActive: jest.fn(() => true),
    onDirtyChanged: jest.fn(),
    onClosed: jest.fn(),
    onFocus: jest.fn(),
  };

  beforeEach(() => {
    manager = new DefaultEditorManager();
  });

  describe('registerFactory', () => {
    it('registers factories sorted by priority descending', () => {
      const low = createMockFactory('low', 1, ['.ts']);
      const high = createMockFactory('high', 10, ['.ts']);
      manager.registerFactory(low);
      manager.registerFactory(high);
      return manager.open('file.ts').then(_widget => {
        expect(high.canHandle).toHaveBeenCalled();
        expect(high.createWidget).toHaveBeenCalled();
      });
    });
  });

  describe('open', () => {
    it('creates a new widget for a uri using the matching factory', async () => {
      const factory = createMockFactory('ts', 5, ['.ts']);
      manager.registerFactory(factory);
      const widget = await manager.open('file.ts');
      expect(widget).toBeDefined();
      expect(factory.canHandle).toHaveBeenCalledWith('file.ts');
      expect(factory.createWidget).toHaveBeenCalledWith('file.ts');
    });

    it('returns existing widget if uri is already open', async () => {
      const factory = createMockFactory('ts', 5, ['.ts']);
      manager.registerFactory(factory);
      const widget1 = await manager.open('file.ts');
      const widget2 = await manager.open('file.ts');
      expect(widget1).toBe(widget2);
      expect(factory.createWidget).toHaveBeenCalledTimes(1);
    });

    it('focusses existing widget on re-open', async () => {
      const factory = createMockFactory('ts', 5, ['.ts']);
      manager.registerFactory(factory);
      const widget = await manager.open('file.ts');
      widget.focus = jest.fn();
      await manager.open('file.ts');
      expect(widget.focus).toHaveBeenCalled();
    });

    it('throws when no factory can handle the uri', async () => {
      await expect(manager.open('file.unknown')).rejects.toThrow('No editor factory can handle: file.unknown');
    });

    it('fires onEditorOpened event', async () => {
      const handler = jest.fn();
      manager.onEditorOpened(handler);
      const factory = createMockFactory('ts', 5, ['.ts']);
      manager.registerFactory(factory);
      await manager.open('file.ts');
      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler.mock.calls[0][0].uri).toBe('file.ts');
    });

    it('sets the new widget as active', async () => {
      const factory = createMockFactory('ts', 5, ['.ts']);
      manager.registerFactory(factory);
      const widget = await manager.open('file.ts');
      expect(manager.getActiveEditor()).toBe(widget);
    });
  });

  describe('getActiveEditor', () => {
    it('returns undefined when no editor is open', () => {
      expect(manager.getActiveEditor()).toBeUndefined();
    });

    it('returns the currently active editor', async () => {
      const factory = createMockFactory('ts', 5, ['.ts']);
      manager.registerFactory(factory);
      const widget = await manager.open('file.ts');
      expect(manager.getActiveEditor()).toBe(widget);
    });
  });

  describe('getEditors', () => {
    it('returns an empty array when no editors are open', () => {
      expect(manager.getEditors()).toEqual([]);
    });

    it('returns all open editors', async () => {
      const factory = createMockFactory('ts', 5, ['.ts', '.js']);
      manager.registerFactory(factory);
      await manager.open('file1.ts');
      await manager.open('file2.js');
      expect(manager.getEditors()).toHaveLength(2);
    });
  });

  describe('getEditor', () => {
    it('returns undefined for an unopened uri', () => {
      expect(manager.getEditor('file.ts')).toBeUndefined();
    });

    it('returns the widget for an open uri', async () => {
      const factory = createMockFactory('ts', 5, ['.ts']);
      manager.registerFactory(factory);
      const widget = await manager.open('file.ts');
      expect(manager.getEditor('file.ts')).toBe(widget);
    });
  });

  describe('close', () => {
    it('closes the widget for the given uri', async () => {
      const factory = createMockFactory('ts', 5, ['.ts']);
      manager.registerFactory(factory);
      const widget = await manager.open('file.ts');
      widget.close = jest.fn();
      await manager.close('file.ts');
      expect(widget.close).toHaveBeenCalled();
    });

    it('does nothing for an unopened uri', async () => {
      await expect(manager.close('file.ts')).resolves.toBeUndefined();
    });
  });

  describe('closeAll', () => {
    it('closes all open editors', async () => {
      const factory = createMockFactory('ts', 5, ['.ts', '.js', '.py']);
      manager.registerFactory(factory);
      const w1 = await manager.open('a.ts');
      const w2 = await manager.open('b.js');
      const w3 = await manager.open('c.py');
      w1.close = jest.fn();
      w2.close = jest.fn();
      w3.close = jest.fn();
      await manager.closeAll();
      expect(w1.close).toHaveBeenCalled();
      expect(w2.close).toHaveBeenCalled();
      expect(w3.close).toHaveBeenCalled();
    });
  });

  describe('onEditorClosed', () => {
    it('fires when a widget triggers close', async () => {
      const factory = createMockFactory('ts', 5, ['.ts']);
      manager.registerFactory(factory);
      const handler = jest.fn();
      manager.onEditorClosed(handler);
      await manager.open('file.ts');
      const widget = manager.getEditor('file.ts')!;
      const closeHandler = (widget.onClosed as jest.Mock).mock.calls[0][0];
      closeHandler();
      expect(handler).toHaveBeenCalledWith('file.ts');
    });
  });

  describe('onActiveEditorChanged', () => {
    it('fires when a new editor is opened', async () => {
      const handler = jest.fn();
      manager.onActiveEditorChanged(handler);
      const factory = createMockFactory('ts', 5, ['.ts']);
      manager.registerFactory(factory);
      await manager.open('file.ts');
      expect(handler).toHaveBeenCalledTimes(1);
    });
  });
});
